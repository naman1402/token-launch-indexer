// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import "../src/Sniper.sol";
import "forge-std/console.sol";

contract ManageOwnershipScript is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sniperAddress = vm.envAddress("SNIPER_ADDRESS");
        address newOwner = vm.envAddress("NEW_OWNER");
        
        // Convert address to payable address before casting to Sniper
        Sniper sniper = Sniper(payable(sniperAddress));
        
        // Print current owner
        console.log("Current owner:", sniper.owner());
        
        vm.startBroadcast(ownerPrivateKey);
        
        // Transfer ownership
        sniper.transferOwnership(newOwner);
        
        vm.stopBroadcast();
        
        console.log("New owner:", sniper.owner());
        
        // Try calling onlyOwner function with old owner (should fail)
        vm.expectRevert("Sniper: caller is not the owner");
        vm.prank(address(this));
        sniper.transferOwnership(address(0x123));
    }
}
