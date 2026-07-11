// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "./BasketTypes.sol";
import {Basket} from "./Basket.sol";

/// @title BasketFactory — token registry + basket deployer for HOODL on Robinhood Chain
/// @notice Owner registers allowed tokens with their price source + token/USDG routing pool, and sets
///         the global StateView/treasury config. Anyone can create a basket over registered tokens.
contract BasketFactory is IBasketFactory, Ownable {
    uint16 internal constant WEIGHT_TOTAL = 10_000;
    uint16 internal constant MAX_FEE_BPS = 1_000; // ≤10% per side
    uint16 internal constant MIN_HOLDER_BPS = 5_000; // holders always keep the majority

    address public immutable poolManager;
    address public immutable usdg;

    mapping(address => TokenConfig) internal _tokens;
    GlobalConfig internal _global;
    address[] public allBaskets;

    event TokenSet(address indexed token, PriceSource source);
    event GlobalSet();
    event BasketCreated(address indexed basket, address indexed admin, uint64 hodlTill);

    error BadDecimals();
    error NotAllowed(address token);
    error BadConfig();
    error BadWeights();
    error BadFees();
    error DuplicateToken(address token);
    error BadHodlTill();

    constructor(address _poolManager, address _usdg, address _owner) Ownable(_owner) {
        poolManager = _poolManager;
        usdg = _usdg;
    }

    // ─────────────────────────────── admin config ───────────────────────────────

    /// @notice Whitelist + configure a token's price source and token/USDG routing pool.
    function setToken(address token, TokenConfig calldata cfg) external onlyOwner {
        if (token == address(0) || cfg.source == PriceSource.NONE) revert BadConfig();
        if (IERC20Metadata(token).decimals() != 18) revert BadDecimals(); // PriceLib invariant
        if (cfg.source == PriceSource.CHAINLINK && cfg.chainlinkFeed == address(0)) revert BadConfig();

        // usdgPoolKey must be the token/USDG pool, consistent with tokenIsCurrency0
        address c0 = Currency.unwrap(cfg.usdgPoolKey.currency0);
        address c1 = Currency.unwrap(cfg.usdgPoolKey.currency1);
        if (cfg.tokenIsCurrency0) {
            if (c0 != token || c1 != usdg) revert BadConfig();
        } else {
            if (c0 != usdg || c1 != token) revert BadConfig();
        }

        _tokens[token] = cfg;
        emit TokenSet(token, cfg.source);
    }

    /// @notice Set the global StateView lens, sequencer feed, and treasury.
    function setGlobal(GlobalConfig calldata cfg) external onlyOwner {
        if (cfg.stateView == address(0) || cfg.treasury == address(0)) revert BadConfig();
        _global = cfg;
        emit GlobalSet();
    }

    // ─────────────────────────────── views ───────────────────────────────

    function tokenConfig(address token) external view returns (TokenConfig memory) {
        return _tokens[token];
    }

    function globalConfig() external view returns (GlobalConfig memory) {
        return _global;
    }

    function basketsCount() external view returns (uint256) {
        return allBaskets.length;
    }

    // ─────────────────────────────── create ───────────────────────────────

    function createBasket(
        address[] calldata tokens,
        uint16[] calldata weightsBps,
        FeeConfig calldata fees,
        uint64 hodlTill,
        address admin
    ) external returns (address basket) {
        uint256 n = tokens.length;
        if (n == 0 || n != weightsBps.length) revert BadWeights();
        if (admin == address(0)) revert BadConfig();
        if (hodlTill <= block.timestamp) revert BadHodlTill();

        // weights sum to 100%, tokens allowed + unique
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (_tokens[tokens[i]].source == PriceSource.NONE) revert NotAllowed(tokens[i]);
            for (uint256 j; j < i; ++j) {
                if (tokens[j] == tokens[i]) revert DuplicateToken(tokens[i]);
            }
            sum += weightsBps[i];
        }
        if (sum != WEIGHT_TOTAL) revert BadWeights();

        // fee sanity
        if (fees.entryFeeBps > MAX_FEE_BPS || fees.exitFeeBps > MAX_FEE_BPS) revert BadFees();
        if (uint256(fees.holderBps) + fees.creatorBps + fees.protocolBps != WEIGHT_TOTAL) revert BadFees();
        if (fees.holderBps < MIN_HOLDER_BPS) revert BadFees();

        basket = address(new Basket(IBasketFactory(address(this)), tokens, weightsBps, fees, hodlTill, admin));
        allBaskets.push(basket);
        emit BasketCreated(basket, admin, hodlTill);
    }
}
