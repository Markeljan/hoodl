// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {TokenConfig, GlobalConfig} from "../BasketTypes.sol";

/// @notice Read-only surface a Basket needs from its factory (routing/pricing config lives centrally).
interface IBasketFactory {
    function poolManager() external view returns (address);
    function usdg() external view returns (address);
    function tokenConfig(address token) external view returns (TokenConfig memory);
    function globalConfig() external view returns (GlobalConfig memory);
}
