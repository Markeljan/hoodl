// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";

/// @notice Minimal settable Chainlink feed for tests (price feed or sequencer-uptime feed).
contract MockAggregator is IAggregatorV3 {
    uint8 public decimals;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;

    constructor(uint8 d, int256 a) {
        decimals = d;
        answer = a;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
    }

    function set(int256 a, uint256 u) external {
        answer = a;
        updatedAt = u;
    }

    function setStarted(uint256 s) external {
        startedAt = s;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, startedAt, updatedAt, 1);
    }
}
