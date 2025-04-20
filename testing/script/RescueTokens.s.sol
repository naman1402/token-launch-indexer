// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import "../src/Sniper.sol";
import "../src/interfaces/IERC20.sol";
import "forge-std/console.sol";

contract RescueTokensScript is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sniperAddress = vm.envAddress("SNIPER_ADDRESS");
        address tokenToRescue = vm.envAddress("TOKEN_TO_RESCUE");
        address rescueTo = vm.envAddress("RESCUE_TO");
        
        // Convert address to payable address before casting to Sniper
        Sniper sniper = Sniper(payable(sniperAddress));
        IERC20 token = IERC20(tokenToRescue);
        
        // Check initial balances
        uint256 initialContractBalance = token.balanceOf(sniperAddress);
        uint256 initialRecipientBalance = token.balanceOf(rescueTo);
        
        console.log("Initial contract token balance:", initialContractBalance);
        console.log("Initial recipient token balance:", initialRecipientBalance);
        
        // Calculate amount to rescue (all tokens in the contract)
        uint256 amountToRescue = initialContractBalance;
        
        vm.startBroadcast(ownerPrivateKey);
        
        // Rescue tokens
        sniper.rescueERC20(tokenToRescue, rescueTo, amountToRescue);
        
        vm.stopBroadcast();
        
        // Check final balances
        uint256 finalContractBalance = token.balanceOf(sniperAddress);
        uint256 finalRecipientBalance = token.balanceOf(rescueTo);
        
        console.log("Final contract token balance:", finalContractBalance);
        console.log("Final recipient token balance:", finalRecipientBalance);
        console.log("Tokens rescued:", amountToRescue);
    }
}
