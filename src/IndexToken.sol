// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
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
///
///         Fees (all in shares, all snapshotted at creation, all fully backed — zero dilution):
///         • protocol mint/redeem fee → factory.treasury() (live-read recipient)
///         • creator mint/redeem fee → `creator` (the index's author; recipient rotatable)
///         Redeem fees are taken by TRANSFERRING shares to the fee recipients, never by touching the
///         basket: redemption remains deterministic, market-free, and can never be blocked.
/// @dev No admin can touch funds or composition — the only creator powers are display metadata and
///      fee-recipient rotation; fee RATES are immutable. The only external dependency is the
///      factory's `treasury()`. Rounding: deposits round UP, redemptions round DOWN, so the vault
///      can never owe more than it holds (solvency invariant:
///      balanceOf(component) ≥ units·totalSupply/1e18 at all times).
///      Non-standard ERC-20s (fee-on-transfer, rebasing) are unsupported: an index containing one is
///      broken *in isolation* — it cannot affect any other index or the factory.
contract IndexToken is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant SHARE_UNIT = 1e18;
    uint256 public constant MAX_COMPONENTS = 16;
    uint16 public constant MAX_FEE_BPS = 100; // 1% hard cap on EACH of the four fee rates
    uint16 internal constant BPS = 10_000;

    struct TokenParams {
        string name;
        string symbol;
        address[] tokens;
        uint256[] units;
        uint16 protocolMintFeeBps;
        uint16 protocolRedeemFeeBps;
        address creator;
        uint16 creatorMintFeeBps;
        uint16 creatorRedeemFeeBps;
        string description;
        string imageURI;
    }

    IIndexFactory public immutable factory;
    // snapshotted at creation — can never change for this index
    uint16 public immutable protocolMintFeeBps;
    uint16 public immutable protocolRedeemFeeBps;
    uint16 public immutable creatorMintFeeBps;
    uint16 public immutable creatorRedeemFeeBps;

    /// @notice Receives the creator fees. Rotatable by the current creator (a sellable revenue
    ///         stream) — the fee RATES above are immutable.
    address public creator;

    /// @notice Display metadata, also served on-chain via {tokenURI}. Creator-updatable; touches
    ///         nothing economic.
    string public description;
    string public imageURI;

    address[] internal _components;
    uint256[] internal _units; // raw token units per 1e18 shares

    event Minted(address indexed minter, address indexed to, uint256 grossShares, uint256 sharesOut);
    event Redeemed(address indexed redeemer, address indexed to, uint256 shares, uint256 sharesBurned);
    event CreatorSet(address indexed creator);
    event MetadataSet(string description, string imageURI);

    error BadComponents();
    error BadCreator();
    error FeeTooHigh();
    error NotCreator();
    error ZeroShares();

    modifier onlyCreator() {
        if (msg.sender != creator) revert NotCreator();
        _;
    }

    constructor(TokenParams memory p, IIndexFactory factory_) ERC20(p.name, p.symbol) {
        uint256 n = p.tokens.length;
        if (n == 0 || n > MAX_COMPONENTS || n != p.units.length) revert BadComponents();
        for (uint256 i; i < n; ++i) {
            if (p.tokens[i] == address(0) || p.units[i] == 0) revert BadComponents();
            for (uint256 j; j < i; ++j) {
                if (p.tokens[j] == p.tokens[i]) revert BadComponents();
            }
            _components.push(p.tokens[i]);
            _units.push(p.units[i]);
        }
        if (p.creator == address(0)) revert BadCreator();
        if (
            p.protocolMintFeeBps > MAX_FEE_BPS || p.protocolRedeemFeeBps > MAX_FEE_BPS
                || p.creatorMintFeeBps > MAX_FEE_BPS || p.creatorRedeemFeeBps > MAX_FEE_BPS
        ) revert FeeTooHigh();
        protocolMintFeeBps = p.protocolMintFeeBps;
        protocolRedeemFeeBps = p.protocolRedeemFeeBps;
        creator = p.creator;
        creatorMintFeeBps = p.creatorMintFeeBps;
        creatorRedeemFeeBps = p.creatorRedeemFeeBps;
        description = p.description;
        imageURI = p.imageURI;
        factory = factory_;
    }

    // ─────────────────────────────── mint / redeem ───────────────────────────────

    /// @notice Deposit the exact backing for `shares` gross shares, in-kind. You receive
    ///         `shares − fees`; the fees (in shares, fully backed by your deposit — zero dilution to
    ///         existing holders) go to the protocol treasury and the index creator.
    /// @dev Deterministic: no slippage params, no deadline, no price involved.
    function mint(uint256 shares, address to) external nonReentrant returns (uint256 sharesOut) {
        if (shares == 0) revert ZeroShares();
        uint256 n = _components.length;
        for (uint256 i; i < n; ++i) {
            uint256 amountIn = Math.mulDiv(_units[i], shares, SHARE_UNIT, Math.Rounding.Ceil);
            IERC20(_components[i]).safeTransferFrom(msg.sender, address(this), amountIn);
        }
        uint256 protocolFee = shares * protocolMintFeeBps / BPS;
        uint256 creatorFee = shares * creatorMintFeeBps / BPS;
        sharesOut = shares - protocolFee - creatorFee;
        _mint(to, sharesOut);
        if (protocolFee > 0) _mint(factory.treasury(), protocolFee);
        if (creatorFee > 0) _mint(creator, creatorFee);
        emit Minted(msg.sender, to, shares, sharesOut);
    }

    /// @notice Burn shares and receive the pro-rata basket in-kind. Always available and needs no
    ///         market: redemption works even if every DEX pool for the components is empty.
    /// @dev The redeem fees are charged in SHARES (transferred to the recipients, still fully
    ///      backed), never in basket tokens — `shares − fees` are burned and you receive their exact
    ///      backing. Nothing can pause or gate this function.
    function redeem(uint256 shares, address to) external nonReentrant returns (uint256[] memory amounts) {
        if (shares == 0) revert ZeroShares();
        uint256 protocolFee = shares * protocolRedeemFeeBps / BPS;
        uint256 creatorFee = shares * creatorRedeemFeeBps / BPS;
        if (protocolFee > 0) _transfer(msg.sender, factory.treasury(), protocolFee);
        if (creatorFee > 0) _transfer(msg.sender, creator, creatorFee);
        uint256 netShares = shares - protocolFee - creatorFee;
        _burn(msg.sender, netShares);
        uint256 n = _components.length;
        amounts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 amountOut = Math.mulDiv(_units[i], netShares, SHARE_UNIT); // floor
            amounts[i] = amountOut;
            if (amountOut > 0) IERC20(_components[i]).safeTransfer(to, amountOut);
        }
        emit Redeemed(msg.sender, to, shares, netShares);
    }

    // ─────────────────────────────── creator surface (non-economic) ───────────────────────────────

    /// @notice Rotate the creator-fee recipient. Display + fee routing only — cannot touch funds.
    function setCreator(address newCreator) external onlyCreator {
        if (newCreator == address(0)) revert BadCreator();
        creator = newCreator;
        emit CreatorSet(newCreator);
    }

    /// @notice Update display metadata (served via {tokenURI}). Cannot touch funds or composition.
    function setMetadata(string calldata description_, string calldata imageURI_) external onlyCreator {
        description = description_;
        imageURI = imageURI_;
        emit MetadataSet(description_, imageURI_);
    }

    // ─────────────────────────────── views ───────────────────────────────

    function components() external view returns (address[] memory tokens, uint256[] memory units) {
        return (_components, _units);
    }

    function componentsLength() external view returns (uint256) {
        return _components.length;
    }

    /// @notice All four fee rates in one call (protocol mint/redeem, creator mint/redeem).
    function feeBps() external view returns (uint16, uint16, uint16, uint16) {
        return (protocolMintFeeBps, protocolRedeemFeeBps, creatorMintFeeBps, creatorRedeemFeeBps);
    }

    /// @notice Exact deposit amounts for `shares` gross shares, and the net shares you'd receive.
    function previewMint(uint256 shares) external view returns (uint256[] memory amountsIn, uint256 sharesOut) {
        uint256 n = _components.length;
        amountsIn = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amountsIn[i] = Math.mulDiv(_units[i], shares, SHARE_UNIT, Math.Rounding.Ceil);
        }
        sharesOut = shares - (shares * protocolMintFeeBps / BPS) - (shares * creatorMintFeeBps / BPS);
    }

    /// @notice Exact amounts returned for redeeming `shares` (net of redeem fees).
    function previewRedeem(uint256 shares) external view returns (uint256[] memory amountsOut) {
        uint256 netShares = shares - (shares * protocolRedeemFeeBps / BPS) - (shares * creatorRedeemFeeBps / BPS);
        uint256 n = _components.length;
        amountsOut = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amountsOut[i] = Math.mulDiv(_units[i], netShares, SHARE_UNIT);
        }
    }

    // ─────────────────────────────── on-chain metadata (EIP-1046 style) ───────────────────────────────

    /// @notice Fully on-chain token metadata: base64 data-URI JSON with name, symbol, description
    ///         and image, so wallets/explorers can render the index without any off-chain registry.
    function tokenURI() external view returns (string memory) {
        return _metadataURI();
    }

    /// @notice Same document under the contract-level-metadata convention some platforms read.
    function contractURI() external view returns (string memory) {
        return _metadataURI();
    }

    function _metadataURI() internal view returns (string memory) {
        bytes memory json = abi.encodePacked(
            '{"name":"',
            _jsonEscape(name()),
            '","symbol":"',
            _jsonEscape(symbol()),
            '","description":"',
            _jsonEscape(description),
            '","image":"',
            _jsonEscape(imageURI),
            '"}'
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    /// @dev Escapes `"` and `\`, flattens control chars to spaces — keeps the JSON document valid
    ///      whatever the creator typed.
    function _jsonEscape(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        uint256 extra;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == '"' || b[i] == "\\") ++extra;
        }
        bytes memory out = new bytes(b.length + extra);
        uint256 j;
        for (uint256 i; i < b.length; ++i) {
            bytes1 c = b[i];
            if (c == '"' || c == "\\") {
                out[j++] = "\\";
                out[j++] = c;
            } else if (uint8(c) < 0x20) {
                out[j++] = " ";
            } else {
                out[j++] = c;
            }
        }
        return string(out);
    }
}
