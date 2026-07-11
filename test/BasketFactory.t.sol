// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BasketFactory} from "../src/BasketFactory.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "../src/BasketTypes.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract BasketFactoryTest is Test {
    BasketFactory factory;
    MockERC20 usdg;
    MockERC20 nvda;
    MockERC20 aapl;
    address poolManager = address(0xBEEF);
    address stateView = address(0x57A7E);
    address treasury = address(0xCAFE);
    address feed = address(0xFEED);

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        aapl = new MockERC20("AAPL", "AAPL", 18);
        factory = new BasketFactory(poolManager, address(usdg), address(this));

        factory.setToken(address(nvda), _chainlinkCfg(address(nvda)));
        factory.setToken(address(aapl), _chainlinkCfg(address(aapl)));
        factory.setGlobal(_global());
    }

    // ── helpers ──
    function _usdgKey(address token, bool tokenIsC0) internal view returns (PoolKey memory) {
        return tokenIsC0
            ? PoolKey(Currency.wrap(token), Currency.wrap(address(usdg)), 3000, 60, IHooks(address(0)))
            : PoolKey(Currency.wrap(address(usdg)), Currency.wrap(token), 3000, 60, IHooks(address(0)));
    }

    function _chainlinkCfg(address token) internal view returns (TokenConfig memory) {
        return TokenConfig(PriceSource.CHAINLINK, feed, 86400, _usdgKey(token, true), true);
    }

    function _global() internal view returns (GlobalConfig memory) {
        return GlobalConfig(stateView, address(0), 3600, treasury);
    }

    function _fees() internal pure returns (FeeConfig memory) {
        return FeeConfig(100, 100, 8000, 1000, 1000);
    }

    function _two() internal view returns (address[] memory t, uint16[] memory w) {
        t = new address[](2);
        w = new uint16[](2);
        t[0] = address(nvda);
        t[1] = address(aapl);
        w[0] = 6000;
        w[1] = 4000;
    }

    // ── setToken ──
    function test_setToken_ok() public view {
        assertEq(uint8(factory.tokenConfig(address(nvda)).source), uint8(PriceSource.CHAINLINK));
    }

    function test_setToken_rejectsNon18Decimals() public {
        MockERC20 six = new MockERC20("X", "X", 6);
        vm.expectRevert(BasketFactory.BadDecimals.selector);
        factory.setToken(address(six), _chainlinkCfg(address(six)));
    }

    function test_setToken_rejectsChainlinkNoFeed() public {
        TokenConfig memory cfg = _chainlinkCfg(address(nvda));
        cfg.chainlinkFeed = address(0);
        vm.expectRevert(BasketFactory.BadConfig.selector);
        factory.setToken(address(nvda), cfg);
    }

    function test_setToken_rejectsWrongPoolKey() public {
        // tokenIsCurrency0=true but pool key doesn't contain the token
        TokenConfig memory cfg = _chainlinkCfg(address(nvda));
        cfg.usdgPoolKey = _usdgKey(address(aapl), true); // wrong token
        vm.expectRevert(BasketFactory.BadConfig.selector);
        factory.setToken(address(nvda), cfg);
    }

    function test_setToken_onlyOwner() public {
        vm.prank(address(0xABCD));
        vm.expectRevert();
        factory.setToken(address(nvda), _chainlinkCfg(address(nvda)));
    }

    function test_setGlobal_rejectsZeroStateView() public {
        vm.expectRevert(BasketFactory.BadConfig.selector);
        factory.setGlobal(GlobalConfig(address(0), address(0), 3600, treasury));
    }

    // ── createBasket ──
    function test_createBasket_ok() public {
        (address[] memory t, uint16[] memory w) = _two();
        address b = factory.createBasket(t, w, _fees(), uint64(block.timestamp + 30 days), address(this));
        assertTrue(b != address(0));
        assertEq(factory.basketsCount(), 1);
    }

    function test_createBasket_badWeightSum() public {
        (address[] memory t, uint16[] memory w) = _two();
        w[0] = 5000; // sums to 9000
        vm.expectRevert(BasketFactory.BadWeights.selector);
        factory.createBasket(t, w, _fees(), uint64(block.timestamp + 1 days), address(this));
    }

    function test_createBasket_duplicateToken() public {
        address[] memory t = new address[](2);
        uint16[] memory w = new uint16[](2);
        t[0] = address(nvda);
        t[1] = address(nvda);
        w[0] = 5000;
        w[1] = 5000;
        vm.expectRevert(abi.encodeWithSelector(BasketFactory.DuplicateToken.selector, address(nvda)));
        factory.createBasket(t, w, _fees(), uint64(block.timestamp + 1 days), address(this));
    }

    function test_createBasket_disallowedToken() public {
        MockERC20 rando = new MockERC20("R", "R", 18);
        address[] memory t = new address[](1);
        uint16[] memory w = new uint16[](1);
        t[0] = address(rando);
        w[0] = 10000;
        vm.expectRevert(abi.encodeWithSelector(BasketFactory.NotAllowed.selector, address(rando)));
        factory.createBasket(t, w, _fees(), uint64(block.timestamp + 1 days), address(this));
    }

    function test_createBasket_holderBelowMajority() public {
        (address[] memory t, uint16[] memory w) = _two();
        FeeConfig memory f = FeeConfig(100, 100, 4000, 3000, 3000); // holder < 5000
        vm.expectRevert(BasketFactory.BadFees.selector);
        factory.createBasket(t, w, f, uint64(block.timestamp + 1 days), address(this));
    }

    function test_createBasket_feeTooHigh() public {
        (address[] memory t, uint16[] memory w) = _two();
        FeeConfig memory f = FeeConfig(1500, 100, 8000, 1000, 1000); // entry 15% > 10% cap
        vm.expectRevert(BasketFactory.BadFees.selector);
        factory.createBasket(t, w, f, uint64(block.timestamp + 1 days), address(this));
    }

    function test_createBasket_pastHodlTill() public {
        (address[] memory t, uint16[] memory w) = _two();
        vm.expectRevert(BasketFactory.BadHodlTill.selector);
        factory.createBasket(t, w, _fees(), uint64(block.timestamp), address(this));
    }
}
