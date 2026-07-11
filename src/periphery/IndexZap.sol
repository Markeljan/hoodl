// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCallback} from "v4-periphery/src/base/SafeCallback.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IndexToken} from "../IndexToken.sol";

/// @title IndexZap — one-transaction USDG ↔ index convenience router
/// @notice PERIPHERY. The core index never needs this: mint/redeem are in-kind and price-free. The
///         zap exists purely for UX — `zapMint` turns USDG into index shares (buys each component on
///         its token/USDG Uniswap v4 pool, then mints in-kind); `zapRedeem` unwinds shares back to
///         USDG. Routing configs are owner-curated; a token without one can still always be minted
///         and redeemed in-kind directly.
/// @dev No oracle: the user's `maxUsdgIn` / `minUsdgOut` bounds are the only (and sufficient) price
///      guard. Component acquisition uses EXACT-OUTPUT swaps so the in-kind mint amounts match to
///      the wei; a pool too thin to fill reverts loudly (`InsufficientLiquidity`) instead of
///      leaving dust. USDG appearing as an index component is handled as a cash leg (no swap).
contract IndexZap is Ownable, ReentrancyGuard, SafeCallback {
    using SafeERC20 for IERC20;

    uint8 internal constant ACTION_BUY = 0; // USDG -> components (exact output)
    uint8 internal constant ACTION_SELL = 1; // components -> USDG (exact input)

    address public immutable usdg;

    mapping(address => PoolKey) internal _pools; // token => its token/USDG pool
    mapping(address => bool) public hasPool;

    event PoolSet(address indexed token);
    event ZapMint(address indexed user, address indexed index, uint256 usdgSpent, uint256 sharesOut);
    event ZapRedeem(address indexed user, address indexed index, uint256 sharesIn, uint256 usdgOut);

    error BadPool();
    error NoPool(address token);
    error Slippage();
    error InsufficientLiquidity(address token);
    error ZeroShares();

    constructor(IPoolManager poolManager_, address usdg_, address owner_) SafeCallback(poolManager_) Ownable(owner_) {
        usdg = usdg_;
    }

    // ─────────────────────────────── config ───────────────────────────────

    /// @notice Register the token/USDG v4 pool used to route `token`. Orientation is derived from
    ///         the key itself (one side must be `token`, the other USDG).
    function setPool(address token, PoolKey calldata key) external onlyOwner {
        address c0 = Currency.unwrap(key.currency0);
        address c1 = Currency.unwrap(key.currency1);
        if (!(c0 == token && c1 == usdg) && !(c0 == usdg && c1 == token)) revert BadPool();
        _pools[token] = key;
        hasPool[token] = true;
        emit PoolSet(token);
    }

    function poolOf(address token) external view returns (PoolKey memory) {
        return _pools[token];
    }

    // ─────────────────────────────── zap in ───────────────────────────────

    /// @notice Buy `grossShares` of `index` with USDG in one tx. Pulls up to `maxUsdgIn`, buys the
    ///         exact component amounts on v4, mints in-kind, refunds the unspent USDG.
    /// @return sharesOut shares received (grossShares minus the index's protocol + creator mint fees)
    /// @return usdgSpent total USDG consumed (swaps + any USDG cash leg)
    function zapMint(IndexToken index, uint256 grossShares, uint256 maxUsdgIn)
        external
        nonReentrant
        returns (uint256 sharesOut, uint256 usdgSpent)
    {
        if (grossShares == 0) revert ZeroShares();
        IERC20(usdg).safeTransferFrom(msg.sender, address(this), maxUsdgIn);

        (uint256[] memory amounts,) = index.previewMint(grossShares);
        (address[] memory tokens,) = index.components();

        // USDG cash leg (if the index holds USDG itself) is not swapped — just reserved.
        uint256 usdgLeg;
        uint256 swapLegs;
        for (uint256 i; i < tokens.length; ++i) {
            if (amounts[i] == 0) continue;
            if (tokens[i] == usdg) usdgLeg = amounts[i];
            else ++swapLegs;
        }
        if (usdgLeg > maxUsdgIn) revert Slippage();

        uint256 swapSpent;
        if (swapLegs > 0) {
            bytes memory ret = poolManager.unlock(abi.encode(ACTION_BUY, tokens, amounts, maxUsdgIn - usdgLeg));
            swapSpent = abi.decode(ret, (uint256));
        }
        usdgSpent = swapSpent + usdgLeg;

        // in-kind mint: the index pulls exactly `amounts` (same ceil math as previewMint)
        for (uint256 i; i < tokens.length; ++i) {
            if (amounts[i] > 0) IERC20(tokens[i]).forceApprove(address(index), amounts[i]);
        }
        sharesOut = index.mint(grossShares, msg.sender);

        uint256 refund = maxUsdgIn - usdgSpent;
        if (refund > 0) IERC20(usdg).safeTransfer(msg.sender, refund);
        emit ZapMint(msg.sender, address(index), usdgSpent, sharesOut);
    }

    // ─────────────────────────────── zap out ───────────────────────────────

    /// @notice Redeem `shares` of `index` and sell every component for USDG in one tx.
    function zapRedeem(IndexToken index, uint256 shares, uint256 minUsdgOut)
        external
        nonReentrant
        returns (uint256 usdgOut)
    {
        if (shares == 0) revert ZeroShares();
        IERC20(address(index)).safeTransferFrom(msg.sender, address(this), shares);
        uint256[] memory amounts = index.redeem(shares, address(this));
        (address[] memory tokens,) = index.components();

        uint256 usdgLeg;
        uint256 swapLegs;
        for (uint256 i; i < tokens.length; ++i) {
            if (amounts[i] == 0) continue;
            if (tokens[i] == usdg) usdgLeg = amounts[i];
            else ++swapLegs;
        }

        uint256 swapped;
        if (swapLegs > 0) {
            bytes memory ret = poolManager.unlock(abi.encode(ACTION_SELL, tokens, amounts, uint256(0)));
            swapped = abi.decode(ret, (uint256));
        }
        usdgOut = swapped + usdgLeg;
        if (usdgOut < minUsdgOut) revert Slippage();
        IERC20(usdg).safeTransfer(msg.sender, usdgOut);
        emit ZapRedeem(msg.sender, address(index), shares, usdgOut);
    }

    // ─────────────────────────────── v4 callback ───────────────────────────────

    function _unlockCallback(bytes calldata raw) internal override returns (bytes memory) {
        (uint8 action, address[] memory tokens, uint256[] memory amounts, uint256 budget) =
            abi.decode(raw, (uint8, address[], uint256[], uint256));
        return action == ACTION_BUY ? _buy(tokens, amounts, budget) : _sell(tokens, amounts);
    }

    /// @dev Exact-output buy of each component with USDG; settle the aggregate USDG debt once.
    function _buy(address[] memory tokens, uint256[] memory amounts, uint256 budget) internal returns (bytes memory) {
        uint256 spent;
        for (uint256 i; i < tokens.length; ++i) {
            address token = tokens[i];
            uint256 amount = amounts[i];
            if (amount == 0 || token == usdg) continue;
            if (!hasPool[token]) revert NoPool(token);
            PoolKey memory key = _pools[token];
            bool tokenIsC0 = Currency.unwrap(key.currency0) == token;

            // buying `token` with USDG: sell the USDG side into the token side, exact output
            BalanceDelta d = poolManager.swap(key, _params(!tokenIsC0, int256(amount)), "");
            uint256 got = _abs(tokenIsC0 ? d.amount0() : d.amount1());
            if (got != amount) revert InsufficientLiquidity(token); // thin pool: partial fill
            spent += _abs(tokenIsC0 ? d.amount1() : d.amount0());
            poolManager.take(Currency.wrap(token), address(this), amount);
        }
        if (spent > budget) revert Slippage();
        _payUsdg(spent);
        return abi.encode(spent);
    }

    /// @dev Exact-input sale of each component for USDG; take the aggregate USDG credit once.
    function _sell(address[] memory tokens, uint256[] memory amounts) internal returns (bytes memory) {
        uint256 usdgAcc;
        for (uint256 i; i < tokens.length; ++i) {
            address token = tokens[i];
            uint256 amount = amounts[i];
            if (amount == 0 || token == usdg) continue;
            if (!hasPool[token]) revert NoPool(token);
            PoolKey memory key = _pools[token];
            bool tokenIsC0 = Currency.unwrap(key.currency0) == token;

            BalanceDelta d = poolManager.swap(key, _params(tokenIsC0, -int256(amount)), "");
            uint256 paid = _abs(tokenIsC0 ? d.amount0() : d.amount1());
            if (paid != amount) revert InsufficientLiquidity(token); // limit hit: input not consumed
            usdgAcc += _abs(tokenIsC0 ? d.amount1() : d.amount0());

            // settle the component we owe
            Currency c = Currency.wrap(token);
            poolManager.sync(c);
            c.transfer(address(poolManager), amount);
            poolManager.settle();
        }
        if (usdgAcc > 0) poolManager.take(Currency.wrap(usdg), address(this), usdgAcc);
        return abi.encode(usdgAcc);
    }

    // ─────────────────────────────── helpers ───────────────────────────────

    function _params(bool zeroForOne, int256 amountSpecified) internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }

    function _payUsdg(uint256 amount) internal {
        if (amount == 0) return;
        Currency c = Currency.wrap(usdg);
        poolManager.sync(c);
        c.transfer(address(poolManager), amount);
        poolManager.settle();
    }

    function _abs(int128 x) internal pure returns (uint256) {
        return x < 0 ? uint256(uint128(-x)) : uint256(uint128(x));
    }
}
