// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IIndexFactory} from "./interfaces/IIndexFactory.sol";

/// @title IndexToken — a self-maintaining, in-kind-redeemable index as an ERC-20
/// @notice One share (1e18) is a fixed basket: `units[i]` raw units of `components[i]`. Mint by
///         depositing the exact basket in-kind; redeem by burning shares for the exact basket back.
///         That's the whole product:
///         • No manager, no keeper, no oracle, no rebalancing — composition is immutable and units
///           are fixed, so USD weights float exactly like a held portfolio (cap-weight behavior).
///         • Anyone is the authorized participant: when the token trades away from NAV, anyone can
///           mint/redeem in-kind and arb it back. Peg maintenance is permissionless.
///         • The share is a standard ERC-20 — transfer it, LP it, collateralize it.
/// @dev No admin functions exist on this contract. The only external dependency is the factory's
///      `treasury()` for the mint fee. Rounding: deposits round UP, redemptions round DOWN, so the
///      vault can never owe more than it holds (solvency invariant:
///      balanceOf(component) ≥ units·totalSupply/1e18 at all times).
///      Non-standard ERC-20s (fee-on-transfer, rebasing) are unsupported: an index containing one is
///      broken *in isolation* — it cannot affect any other index or the factory.
contract IndexToken is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant SHARE_UNIT = 1e18;
    uint256 public constant MAX_COMPONENTS = 16;
    uint16 internal constant BPS = 10_000;

    IIndexFactory public immutable factory;
    uint16 public immutable mintFeeBps; // snapshotted at creation — can never change for this index

    address[] internal _components;
    uint256[] internal _units; // raw token units per 1e18 shares

    event Minted(address indexed minter, address indexed to, uint256 grossShares, uint256 sharesOut);
    event Redeemed(address indexed redeemer, address indexed to, uint256 shares);

    error BadComponents();
    error ZeroShares();

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory tokens_,
        uint256[] memory units_,
        uint16 mintFeeBps_,
        IIndexFactory factory_
    ) ERC20(name_, symbol_) {
        uint256 n = tokens_.length;
        if (n == 0 || n > MAX_COMPONENTS || n != units_.length) revert BadComponents();
        for (uint256 i; i < n; ++i) {
            if (tokens_[i] == address(0) || units_[i] == 0) revert BadComponents();
            for (uint256 j; j < i; ++j) {
                if (tokens_[j] == tokens_[i]) revert BadComponents();
            }
            _components.push(tokens_[i]);
            _units.push(units_[i]);
        }
        mintFeeBps = mintFeeBps_;
        factory = factory_;
    }

    // ─────────────────────────────── mint / redeem ───────────────────────────────

    /// @notice Deposit the exact backing for `shares` gross shares, in-kind. You receive
    ///         `shares − fee`; the fee (in shares, fully backed by your deposit — zero dilution to
    ///         existing holders) goes to the protocol treasury.
    /// @dev Deterministic: no slippage params, no deadline, no price involved.
    function mint(uint256 shares, address to) external nonReentrant returns (uint256 sharesOut) {
        if (shares == 0) revert ZeroShares();
        uint256 n = _components.length;
        for (uint256 i; i < n; ++i) {
            uint256 amountIn = Math.mulDiv(_units[i], shares, SHARE_UNIT, Math.Rounding.Ceil);
            IERC20(_components[i]).safeTransferFrom(msg.sender, address(this), amountIn);
        }
        uint256 feeShares = shares * mintFeeBps / BPS;
        sharesOut = shares - feeShares;
        _mint(to, sharesOut);
        if (feeShares > 0) _mint(factory.treasury(), feeShares);
        emit Minted(msg.sender, to, shares, sharesOut);
    }

    /// @notice Burn `shares` and receive the pro-rata basket in-kind. Always available, never fee'd,
    ///         needs no market: redemption works even if every DEX pool for the components is empty.
    function redeem(uint256 shares, address to) external nonReentrant returns (uint256[] memory amounts) {
        if (shares == 0) revert ZeroShares();
        _burn(msg.sender, shares);
        uint256 n = _components.length;
        amounts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 amountOut = Math.mulDiv(_units[i], shares, SHARE_UNIT); // floor
            amounts[i] = amountOut;
            if (amountOut > 0) IERC20(_components[i]).safeTransfer(to, amountOut);
        }
        emit Redeemed(msg.sender, to, shares);
    }

    // ─────────────────────────────── views ───────────────────────────────

    function components() external view returns (address[] memory tokens, uint256[] memory units) {
        return (_components, _units);
    }

    function componentsLength() external view returns (uint256) {
        return _components.length;
    }

    /// @notice Exact deposit amounts for `shares` gross shares, and the net shares you'd receive.
    function previewMint(uint256 shares) external view returns (uint256[] memory amountsIn, uint256 sharesOut) {
        uint256 n = _components.length;
        amountsIn = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amountsIn[i] = Math.mulDiv(_units[i], shares, SHARE_UNIT, Math.Rounding.Ceil);
        }
        sharesOut = shares - (shares * mintFeeBps / BPS);
    }

    /// @notice Exact amounts returned for redeeming `shares`.
    function previewRedeem(uint256 shares) external view returns (uint256[] memory amountsOut) {
        uint256 n = _components.length;
        amountsOut = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amountsOut[i] = Math.mulDiv(_units[i], shares, SHARE_UNIT);
        }
    }
}
