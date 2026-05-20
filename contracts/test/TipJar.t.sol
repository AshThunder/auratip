// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";
import {TipJarFactory} from "../src/TipJarFactory.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @dev Minimal ERC20 mock for testing
contract MockUSDC is IERC20 {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract TipJarTest is Test {
    MockUSDC usdc;
    TipJarFactory factory;
    address creator = address(0xC0FFEE);
    address tipper1 = address(0xBEEF);
    address tipper2 = address(0xFACE);

    function setUp() public {
        usdc = new MockUSDC();
        factory = new TipJarFactory(address(usdc));

        usdc.mint(tipper1, 1000e6);
        usdc.mint(tipper2, 500e6);
    }

    function test_CreateTipJar() public {
        vm.prank(creator);
        address jar = factory.createTipJar("Alice");

        assertEq(factory.getTipJar(creator), jar);
        assertEq(factory.tipJarCount(), 1);

        TipJar tipJar = TipJar(jar);
        assertEq(tipJar.creator(), creator);
        assertEq(tipJar.creatorName(), "Alice");
    }

    function test_CannotCreateDuplicate() public {
        vm.startPrank(creator);
        factory.createTipJar("Alice");
        vm.expectRevert(TipJarFactory.AlreadyExists.selector);
        factory.createTipJar("Alice Again");
        vm.stopPrank();
    }

    function test_TipAndWithdraw() public {
        vm.prank(creator);
        address jarAddr = factory.createTipJar("Alice");
        TipJar jar = TipJar(jarAddr);

        // Tipper1 tips 100 USDC
        vm.startPrank(tipper1);
        usdc.approve(jarAddr, 100e6);
        jar.tip(100e6, "Great work!");
        vm.stopPrank();

        assertEq(jar.totalReceived(), 100e6);
        assertEq(jar.tipCount(), 1);
        assertEq(usdc.balanceOf(jarAddr), 100e6);

        // Creator withdraws
        vm.prank(creator);
        jar.withdraw();

        assertEq(usdc.balanceOf(creator), 100e6);
        assertEq(usdc.balanceOf(jarAddr), 0);
    }

    function test_MultipleTips() public {
        vm.prank(creator);
        address jarAddr = factory.createTipJar("Alice");
        TipJar jar = TipJar(jarAddr);

        vm.startPrank(tipper1);
        usdc.approve(jarAddr, 200e6);
        jar.tip(50e6, "Tip 1");
        jar.tip(150e6, "Tip 2");
        vm.stopPrank();

        vm.startPrank(tipper2);
        usdc.approve(jarAddr, 75e6);
        jar.tip(75e6, "From tipper2");
        vm.stopPrank();

        assertEq(jar.totalReceived(), 275e6);
        assertEq(jar.tipCount(), 3);
    }

    function test_OnlyCreatorCanWithdraw() public {
        vm.prank(creator);
        address jarAddr = factory.createTipJar("Alice");
        TipJar jar = TipJar(jarAddr);

        vm.startPrank(tipper1);
        usdc.approve(jarAddr, 50e6);
        jar.tip(50e6, "hi");
        vm.expectRevert(TipJar.OnlyCreator.selector);
        jar.withdraw();
        vm.stopPrank();
    }

    function test_GetTipsPagination() public {
        vm.prank(creator);
        address jarAddr = factory.createTipJar("Alice");
        TipJar jar = TipJar(jarAddr);

        vm.startPrank(tipper1);
        usdc.approve(jarAddr, 500e6);
        for (uint256 i = 0; i < 5; i++) {
            jar.tip(10e6, string(abi.encodePacked("Tip ", vm.toString(i))));
        }
        vm.stopPrank();

        // Get first 3 tips (offset=0, limit=3)
        TipJar.Tip[] memory page = jar.getTips(0, 3);
        assertEq(page.length, 3);
        assertEq(page[0].amount, 10e6);
    }
}
