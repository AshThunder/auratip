// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TipJarFactory} from "../src/TipJarFactory.sol";

contract DeployScript is Script {
    // Arc Testnet USDC
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        TipJarFactory factory = new TipJarFactory(USDC);
        console.log("TipJarFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
