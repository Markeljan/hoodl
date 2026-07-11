// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta, toBalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal v4 PoolManager stand-in for zap unit tests. Implements the exact subset the zap
///         calls (unlock / swap / sync / settle / take) with real flash-accounting (all currency
///         deltas must net to zero before unlock returns). Swaps are VALUE-PRESERVING at configured
///         USD prices (no pool fee, no slippage) and support BOTH exact-input and exact-output, so
///         test amounts assert exactly.
/// @dev Fund this contract with token reserves so `take` can pay out.
contract MockPoolManager {
    struct Px {
        uint256 priceUsd8; // USD price, 8-dec
        uint8 dec; // token decimals
        bool set;
    }

    mapping(address => Px) public px;

    bool public unlocked;
    mapping(address => int256) public delta;
    uint256 public nonzero;
    address internal syncedCurrency;
    uint256 internal syncedBalance;

    error NotSettled();

    function setPrice(address token, uint256 priceUsd8, uint8 dec) external {
        px[token] = Px(priceUsd8, dec, true);
    }

    function unlock(bytes calldata data) external returns (bytes memory ret) {
        require(!unlocked, "already unlocked");
        unlocked = true;
        ret = IUnlockCallback(msg.sender).unlockCallback(data);
        if (nonzero != 0) revert NotSettled();
        unlocked = false;
    }

    function swap(PoolKey calldata key, IPoolManager.SwapParams calldata p, bytes calldata)
        external
        returns (BalanceDelta)
    {
        require(unlocked, "locked");
        address c0 = Currency.unwrap(key.currency0);
        address c1 = Currency.unwrap(key.currency1);
        (address tin, address tout) = p.zeroForOne ? (c0, c1) : (c1, c0);

        uint256 amountIn;
        uint256 amountOut;
        if (p.amountSpecified < 0) {
            // exact input
            amountIn = uint256(-p.amountSpecified);
            amountOut = _quoteOut(tin, tout, amountIn);
        } else {
            // exact output: compute the input needed, rounding up (realistic direction)
            amountOut = uint256(p.amountSpecified);
            amountIn = _quoteIn(tin, tout, amountOut);
        }

        _account(tin, -int256(amountIn));
        _account(tout, int256(amountOut));

        return p.zeroForOne
            ? toBalanceDelta(-int128(int256(amountIn)), int128(int256(amountOut)))
            : toBalanceDelta(int128(int256(amountOut)), -int128(int256(amountIn)));
    }

    function sync(Currency c) external {
        syncedCurrency = Currency.unwrap(c);
        syncedBalance = IERC20(syncedCurrency).balanceOf(address(this));
    }

    function settle() external payable returns (uint256 paid) {
        paid = IERC20(syncedCurrency).balanceOf(address(this)) - syncedBalance;
        _account(syncedCurrency, int256(paid));
    }

    function take(Currency c, address to, uint256 amount) external {
        _account(Currency.unwrap(c), -int256(amount));
        IERC20(Currency.unwrap(c)).transfer(to, amount);
    }

    // ── internal ──

    function _quoteOut(address tin, address tout, uint256 amountIn) internal view returns (uint256) {
        (Px memory pin, Px memory pout) = _pair(tin, tout);
        uint256 valueUsd8 = Math.mulDiv(amountIn, pin.priceUsd8, 10 ** pin.dec);
        return Math.mulDiv(valueUsd8, 10 ** pout.dec, pout.priceUsd8);
    }

    function _quoteIn(address tin, address tout, uint256 amountOut) internal view returns (uint256) {
        (Px memory pin, Px memory pout) = _pair(tin, tout);
        uint256 valueUsd8 = Math.mulDiv(amountOut, pout.priceUsd8, 10 ** pout.dec, Math.Rounding.Ceil);
        return Math.mulDiv(valueUsd8, 10 ** pin.dec, pin.priceUsd8, Math.Rounding.Ceil);
    }

    function _pair(address tin, address tout) internal view returns (Px memory pin, Px memory pout) {
        pin = px[tin];
        pout = px[tout];
        require(pin.set && pout.set, "no price");
    }

    function _account(address cur, int256 d) internal {
        int256 prev = delta[cur];
        int256 next = prev + d;
        if (prev == 0 && next != 0) nonzero++;
        if (prev != 0 && next == 0) nonzero--;
        delta[cur] = next;
    }
}
