// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SafeCallback} from "v4-periphery/src/base/SafeCallback.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {IStateView} from "./interfaces/IStateView.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "./BasketTypes.sol";
import {PriceLib} from "./libraries/PriceLib.sol";

/// @title Basket — a HODL basket over Robinhood stock tokens + memecoins
/// @notice Buy in with USDG (swapped USDG→token directly on Uniswap v4 — the liquid pools on Robinhood
///         Chain are token/USDG). Most of every entry/exit fee accrues to holders as a USDG reward that
///         is only claimable after `hodlTill`. Exit early → forfeit your accrued reward (pro-rata) and
///         pay the exit fee; both go to the holders who stay. Shares are a non-transferable ledger.
contract Basket is SafeCallback, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;

    uint256 internal constant ACC_PRECISION = 1e18;
    uint16 internal constant BPS = 10_000;

    enum Action {
        DEPOSIT,
        WITHDRAW,
        REBALANCE
    }

    IBasketFactory public immutable factory;
    address public immutable usdg;
    uint64 public immutable hodlTill;
    address public immutable admin;
    uint16 public immutable entryFeeBps;
    uint16 public immutable exitFeeBps;
    uint16 public immutable holderBps;
    uint16 public immutable creatorBps;
    uint16 public immutable protocolBps;

    address[] public tokens;
    uint16[] public weightsBps;

    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public accRewardPerShare; // USDG, ACC_PRECISION-scaled
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public rewardAccrued; // banked, claimable after hodlTill

    event Deposit(address indexed user, uint256 usdgIn, uint256 sharesOut);
    event Withdraw(address indexed user, uint256 sharesIn, uint256 usdgOut, bool early);
    event Claimed(address indexed user, uint256 usdgOut);
    event Rebalanced(address indexed sellToken, uint256 sellAmount, address indexed buyToken, uint256 buyAmount);

    error ZeroAmount();
    error InsufficientShares();
    error Slippage();
    error Locked();
    error NotAdmin();
    error NothingToClaim();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(
        IBasketFactory _factory,
        address[] memory _tokens,
        uint16[] memory _weights,
        FeeConfig memory _fees,
        uint64 _hodlTill,
        address _admin
    ) SafeCallback(IPoolManager(_factory.poolManager())) {
        factory = _factory;
        usdg = _factory.usdg();
        hodlTill = _hodlTill;
        admin = _admin;
        entryFeeBps = _fees.entryFeeBps;
        exitFeeBps = _fees.exitFeeBps;
        holderBps = _fees.holderBps;
        creatorBps = _fees.creatorBps;
        protocolBps = _fees.protocolBps;
        for (uint256 i; i < _tokens.length; ++i) {
            tokens.push(_tokens[i]);
            weightsBps.push(_weights[i]);
        }
    }

    // ─────────────────────────────── user actions ───────────────────────────────

    /// @notice Buy into the basket with `usdgIn` USDG. Mints shares from the measured NAV increase.
    function deposit(uint256 usdgIn, uint256 minShares) external nonReentrant returns (uint256 sharesOut) {
        if (usdgIn == 0) revert ZeroAmount();
        IERC20(usdg).safeTransferFrom(msg.sender, address(this), usdgIn);

        uint256 fee = uint256(usdgIn) * entryFeeBps / BPS;
        uint256 net = usdgIn - fee;

        uint256 navBefore = nav();
        poolManager.unlock(abi.encode(uint8(Action.DEPOSIT), abi.encode(net)));
        uint256 navAdded = nav() - navBefore;
        if (navAdded == 0) revert ZeroAmount();

        sharesOut = totalShares == 0 ? navAdded : FullMath.mulDiv(navAdded, totalShares, navBefore);
        if (sharesOut < minShares || sharesOut == 0) revert Slippage();

        _distributeFee(fee, totalShares); // holder cut over pre-mint supply
        _mint(msg.sender, sharesOut);
        emit Deposit(msg.sender, usdgIn, sharesOut);
    }

    /// @notice Redeem `sharesIn` for USDG. Before `hodlTill`: pay exit fee + forfeit accrued reward.
    function withdraw(uint256 sharesIn, uint256 minUsdgOut) external nonReentrant returns (uint256 usdgOut) {
        uint256 had = shares[msg.sender];
        if (sharesIn == 0) revert ZeroAmount();
        if (sharesIn > had) revert InsufficientShares();

        _settle(msg.sender); // bank pending onto rewardAccrued
        uint256 supplyBefore = totalShares;

        bytes memory ret = poolManager.unlock(abi.encode(uint8(Action.WITHDRAW), abi.encode(sharesIn, supplyBefore)));
        uint256 gross = abi.decode(ret, (uint256));

        bool early = block.timestamp < hodlTill;
        uint256 remaining = supplyBefore - sharesIn;
        if (early) {
            uint256 exitFee = gross * exitFeeBps / BPS;
            usdgOut = gross - exitFee;
            _distributeFee(exitFee, remaining); // to holders who stay
            // forfeit the leaving portion's accrued reward, pro-rata to shares withdrawn
            uint256 forfeited = FullMath.mulDiv(rewardAccrued[msg.sender], sharesIn, had);
            if (forfeited > 0) {
                rewardAccrued[msg.sender] -= forfeited;
                if (remaining > 0) {
                    accRewardPerShare += FullMath.mulDiv(forfeited, ACC_PRECISION, remaining);
                } else {
                    IERC20(usdg).safeTransfer(factory.globalConfig().treasury, forfeited);
                }
            }
        } else {
            usdgOut = gross;
        }

        _burn(msg.sender, sharesIn);
        if (usdgOut < minUsdgOut) revert Slippage();
        IERC20(usdg).safeTransfer(msg.sender, usdgOut);
        emit Withdraw(msg.sender, sharesIn, usdgOut, early);
    }

    /// @notice Claim accrued USDG rewards. Only after the hodl-till date.
    function claimRewards() external nonReentrant returns (uint256 amount) {
        if (block.timestamp < hodlTill) revert Locked();
        _settle(msg.sender);
        amount = rewardAccrued[msg.sender];
        if (amount == 0) revert NothingToClaim();
        rewardAccrued[msg.sender] = 0;
        IERC20(usdg).safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Admin rebalance: sell `sellAmount` of `sellToken` → USDG → `buyToken` (min `minBuyOut`).
    function rebalance(address sellToken, uint256 sellAmount, address buyToken, uint256 minBuyOut)
        external
        onlyAdmin
        nonReentrant
        returns (uint256 buyOut)
    {
        if (sellAmount == 0) revert ZeroAmount();
        bytes memory ret =
            poolManager.unlock(abi.encode(uint8(Action.REBALANCE), abi.encode(sellToken, sellAmount, buyToken)));
        buyOut = abi.decode(ret, (uint256));
        if (buyOut < minBuyOut) revert Slippage();
        emit Rebalanced(sellToken, sellAmount, buyToken, buyOut);
    }

    // ─────────────────────────────── NAV / views ───────────────────────────────

    /// @notice Basket NAV in USDG (6-dec). Sums token holdings only (reward USDG is excluded).
    function nav() public view returns (uint256 total) {
        GlobalConfig memory g = factory.globalConfig();
        PriceLib.checkSequencer(g.sequencerFeed, g.sequencerGracePeriod);
        uint256 n = tokens.length;
        for (uint256 i; i < n; ++i) {
            address t = tokens[i];
            uint256 bal = IERC20(t).balanceOf(address(this));
            if (bal == 0) continue;
            TokenConfig memory cfg = factory.tokenConfig(t);
            if (cfg.source == PriceSource.CHAINLINK) {
                (uint256 price, uint8 dec) = PriceLib.readFeed(cfg.chainlinkFeed, cfg.maxStaleness);
                total += PriceLib.valueUsdg(bal, price, dec);
            } else {
                (uint160 sp,,,) = IStateView(g.stateView).getSlot0(PoolId.unwrap(cfg.usdgPoolKey.toId()));
                total += PriceLib.poolValueUsdg(bal, sp, cfg.tokenIsCurrency0);
            }
        }
    }

    function pendingRewards(address user) external view returns (uint256) {
        uint256 accumulated = FullMath.mulDiv(shares[user], accRewardPerShare, ACC_PRECISION);
        return rewardAccrued[user] + (accumulated - rewardDebt[user]);
    }

    function tokensLength() external view returns (uint256) {
        return tokens.length;
    }

    // ─────────────────────────────── v4 unlock callback ───────────────────────────────

    function _unlockCallback(bytes calldata raw) internal override returns (bytes memory) {
        (uint8 action, bytes memory data) = abi.decode(raw, (uint8, bytes));
        if (action == uint8(Action.DEPOSIT)) return _doDeposit(data);
        if (action == uint8(Action.WITHDRAW)) return _doWithdraw(data);
        return _doRebalance(data);
    }

    /// @dev USDG → each token directly (by weight). Take tokens, settle total USDG.
    function _doDeposit(bytes memory data) internal returns (bytes memory) {
        uint256 net = abi.decode(data, (uint256));
        uint256 n = tokens.length;
        uint256 used;
        for (uint256 i; i < n; ++i) {
            uint256 usdgIn = (i == n - 1) ? net - used : FullMath.mulDiv(net, weightsBps[i], BPS);
            used += usdgIn;
            if (usdgIn == 0) continue;
            TokenConfig memory cfg = factory.tokenConfig(tokens[i]);
            bool sellUsdg = !cfg.tokenIsCurrency0; // USDG is currency0 iff token is currency1
            BalanceDelta d = poolManager.swap(cfg.usdgPoolKey, _params(sellUsdg, usdgIn), "");
            uint256 tokenOut = _received(d, cfg.tokenIsCurrency0);
            poolManager.take(Currency.wrap(tokens[i]), address(this), tokenOut);
        }
        _pay(usdg, net); // settle total USDG owed across the swaps
        return "";
    }

    /// @dev each token slice → USDG directly. Settle tokens, take total USDG.
    function _doWithdraw(bytes memory data) internal returns (bytes memory) {
        (uint256 sharesIn, uint256 supply) = abi.decode(data, (uint256, uint256));
        uint256 n = tokens.length;
        uint256 usdgOut;
        for (uint256 i; i < n; ++i) {
            address t = tokens[i];
            uint256 amt = FullMath.mulDiv(IERC20(t).balanceOf(address(this)), sharesIn, supply);
            if (amt == 0) continue;
            TokenConfig memory cfg = factory.tokenConfig(t);
            BalanceDelta d = poolManager.swap(cfg.usdgPoolKey, _params(cfg.tokenIsCurrency0, amt), "");
            _pay(t, amt);
            usdgOut += _received(d, !cfg.tokenIsCurrency0); // USDG is the not-token side
        }
        if (usdgOut > 0) poolManager.take(Currency.wrap(usdg), address(this), usdgOut);
        return abi.encode(usdgOut);
    }

    /// @dev sellToken → USDG → buyToken (USDG nets to zero).
    function _doRebalance(bytes memory data) internal returns (bytes memory) {
        (address sellToken, uint256 sellAmount, address buyToken) = abi.decode(data, (address, uint256, address));
        TokenConfig memory sc = factory.tokenConfig(sellToken);
        BalanceDelta d1 = poolManager.swap(sc.usdgPoolKey, _params(sc.tokenIsCurrency0, sellAmount), "");
        _pay(sellToken, sellAmount);
        uint256 usdgMid = _received(d1, !sc.tokenIsCurrency0);

        TokenConfig memory bc = factory.tokenConfig(buyToken);
        BalanceDelta d2 = poolManager.swap(bc.usdgPoolKey, _params(!bc.tokenIsCurrency0, usdgMid), "");
        uint256 buyOut = _received(d2, bc.tokenIsCurrency0);
        poolManager.take(Currency.wrap(buyToken), address(this), buyOut);
        return abi.encode(buyOut);
    }

    // ─────────────────────────────── internal helpers ───────────────────────────────

    /// @dev Exact-input swap params (amountSpecified negative = exact in).
    function _params(bool zeroForOne, uint256 amountIn) internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }

    /// @dev Positive output amount of a swap. `isAmount0` selects which side is the credit.
    function _received(BalanceDelta d, bool isAmount0) internal pure returns (uint256) {
        int128 amt = isAmount0 ? d.amount0() : d.amount1();
        return uint256(uint128(amt));
    }

    /// @dev Pay `amount` of ERC-20 `token` to the PoolManager (settle a negative delta).
    function _pay(address token, uint256 amount) internal {
        Currency c = Currency.wrap(token);
        poolManager.sync(c);
        c.transfer(address(poolManager), amount);
        poolManager.settle();
    }

    function _distributeFee(uint256 fee, uint256 holderBasis) internal {
        if (fee == 0) return;
        uint256 holderCut = uint256(fee) * holderBps / BPS;
        uint256 creatorCut = uint256(fee) * creatorBps / BPS;
        uint256 protocolCut = fee - holderCut - creatorCut;
        GlobalConfig memory g = factory.globalConfig();
        if (creatorCut > 0) IERC20(usdg).safeTransfer(admin, creatorCut);
        if (protocolCut > 0) IERC20(usdg).safeTransfer(g.treasury, protocolCut);
        if (holderCut > 0) {
            if (holderBasis == 0) {
                IERC20(usdg).safeTransfer(g.treasury, holderCut); // no holders → protocol
            } else {
                accRewardPerShare += FullMath.mulDiv(holderCut, ACC_PRECISION, holderBasis);
            }
        }
    }

    function _settle(address user) internal {
        uint256 s = shares[user];
        if (s == 0) return;
        uint256 accumulated = FullMath.mulDiv(s, accRewardPerShare, ACC_PRECISION);
        uint256 pending = accumulated - rewardDebt[user];
        if (pending > 0) rewardAccrued[user] += pending;
        rewardDebt[user] = accumulated;
    }

    function _mint(address user, uint256 amount) internal {
        _settle(user);
        shares[user] += amount;
        totalShares += amount;
        rewardDebt[user] = FullMath.mulDiv(shares[user], accRewardPerShare, ACC_PRECISION);
    }

    function _burn(address user, uint256 amount) internal {
        shares[user] -= amount;
        totalShares -= amount;
        rewardDebt[user] = FullMath.mulDiv(shares[user], accRewardPerShare, ACC_PRECISION);
    }
}
