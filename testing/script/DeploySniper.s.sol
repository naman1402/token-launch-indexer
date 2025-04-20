// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import "../src/Sniper.sol";
import "forge-std/console.sol";

contract DeploySniperScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address uniswapFactory = vm.envAddress("UNISWAP_FACTORY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Sniper sniper = new Sniper(uniswapFactory);
        
        vm.stopBroadcast();
        
        console.log("Sniper deployed at:", address(sniper));
        console.log("Owner:", sniper.owner());
        console.log("Factory:", sniper.factory());
    }
}
