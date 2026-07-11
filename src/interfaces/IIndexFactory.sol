// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice The one thing an IndexToken reads from its factory at runtime.
interface IIndexFactory {
    function treasury() external view returns (address);
}
