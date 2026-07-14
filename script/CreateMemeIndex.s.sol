// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";

/// @title CreateMemeIndex — launch Hood's Most Wanted on Robinhood Chain mainnet
/// @notice Creates an equal-value-at-launch basket of five established Robinhood-native memecoins.
///         The units are immutable and were fixed from the 2026-07-14T20:05:39Z market snapshot in
///         `deployments/robinhood-meme-index.json`.
///
/// Run:
/// PRIVATE_KEY=… forge script script/CreateMemeIndex.s.sol --rpc-url rh_mainnet --broadcast
contract CreateMemeIndex is Script {
    IndexFactory internal constant FACTORY = IndexFactory(0x9C1746bB146E1713DaD64aFC0c8becA5Ee5B9882);
    address internal constant EXPECTED_CREATOR = 0x31B7E879Ea9857770B3258A9eAC52bEeD2fc9271;

    address internal constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address internal constant ARROW = 0xf2915d1e3C1B0c769d0c756Ec43F1c1f6c99cD03;
    address internal constant HOODRAT = 0x8e62F281f282686fCa6dCB39288069a93fC23F1c;
    address internal constant WISHBONE = 0x77581054581B9c525E7dd7a0155DE43867532d03;
    address internal constant HOODIE = 0xC72c01AAB5f5678dc1d6f5C6d2B417d91D402Ba3;

    uint16 internal constant MAX_CREATOR_FEE_BPS = 100;
    string internal constant NAME = "Hood's Most Wanted";
    string internal constant SYMBOL = "hMEME";
    string internal constant IMAGE_URI = "https://hoodl.finance/tokens/hmeme.png";
    string internal constant DESCRIPTION =
        "Five chain-born outlaws. One fully backed bag. hMEME holds equal-value launch units of CASHCAT, ARROW, HOODRAT, WISHBONE, and HOODIE. Fixed basket, in-kind mint/redeem, and the maximum 1% creator fee on both sides to fund memes, bounties, raids, and community growth. Weights float with the winners. Unaffiliated with Robinhood. Memecoins are highly speculative.";

    function run() external returns (address index) {
        require(block.chainid == 4663, "Robinhood mainnet only");

        index = _existingIndex();
        if (index != address(0)) {
            console2.log("hMEME already exists:", index);
            return index;
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address creator = vm.addr(pk);
        require(creator == EXPECTED_CREATOR, "PRIVATE_KEY is not the project deployer");

        (address[] memory tokens, uint256[] memory units) = components();
        vm.startBroadcast(pk);
        index = FACTORY.createIndex(
            IndexFactory.IndexParams({
                name: NAME,
                symbol: SYMBOL,
                tokens: tokens,
                units: units,
                creatorMintFeeBps: MAX_CREATOR_FEE_BPS,
                creatorRedeemFeeBps: MAX_CREATOR_FEE_BPS,
                description: DESCRIPTION,
                imageURI: IMAGE_URI
            })
        );
        vm.stopBroadcast();

        IndexToken launched = IndexToken(index);
        require(launched.creator() == creator, "unexpected creator");
        require(launched.creatorMintFeeBps() == MAX_CREATOR_FEE_BPS, "unexpected mint fee");
        require(launched.creatorRedeemFeeBps() == MAX_CREATOR_FEE_BPS, "unexpected redeem fee");
        console2.log("hMEME index:", index);
        console2.log("creator:    ", creator);
        console2.log("image:      ", IMAGE_URI);
    }

    function components() public pure returns (address[] memory tokens, uint256[] memory units) {
        tokens = new address[](5);
        units = new uint256[](5);

        tokens[0] = CASHCAT;
        units[0] = 6_333_122_229_259_024_699;
        tokens[1] = ARROW;
        units[1] = 719_424_460_431_654_676;
        tokens[2] = HOODRAT;
        units[2] = 120_845_921_450_151_057_401;
        tokens[3] = WISHBONE;
        units[3] = 144_029_958_231_312_112_919;
        tokens[4] = HOODIE;
        units[4] = 73_583_517_292_126_563_649_742;
    }

    function _existingIndex() internal view returns (address) {
        uint256 count = FACTORY.indexesCount();
        bytes32 targetName = keccak256(bytes(NAME));
        bytes32 targetSymbol = keccak256(bytes(SYMBOL));
        for (uint256 i; i < count; ++i) {
            address candidate = FACTORY.allIndexes(i);
            IndexToken token = IndexToken(candidate);
            if (keccak256(bytes(token.name())) == targetName && keccak256(bytes(token.symbol())) == targetSymbol) {
                return candidate;
            }
        }
        return address(0);
    }
}
