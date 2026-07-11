// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Read surface of an index used by periphery (lens, integrators).
interface IIndexToken {
    function components() external view returns (address[] memory tokens, uint256[] memory units);
    function totalSupply() external view returns (uint256);
}
