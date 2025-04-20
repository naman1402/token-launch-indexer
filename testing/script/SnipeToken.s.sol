// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import "../src/Sniper.sol";
import "../src/interfaces/IERC20.sol";
import "forge-std/console.sol";

contract SnipeTokenScript is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sniperAddress = vm.envAddress("SNIPER_ADDRESS");
        address tokenToSnipe = vm.envAddress("TOKEN_TO_SNIPE");
        address baseToken = vm.envAddress("BASE_TOKEN"); // e.g., WETH
        uint256 amountIn = vm.envUint("AMOUNT_IN");
        uint256 minAmountOut = vm.envUint("MIN_AMOUNT_OUT");
        
        // Convert address to payable address before casting to Sniper
        Sniper sniper = Sniper(payable(sniperAddress));
        IERC20 baseTokenContract = IERC20(baseToken);
        
        // Check balances before swap
        uint256 initialBaseBalance = baseTokenContract.balanceOf(msg.sender);
        
        vm.startBroadcast(ownerPrivateKey);
        
        // Approve sniper contract to spend baseToken
        baseTokenContract.approve(sniperAddress, amountIn);
        
        // Execute the snipe
        sniper.snipeToken(tokenToSnipe, baseToken, amountIn, minAmountOut);
        
        vm.stopBroadcast();
        
        // Check balances after swap
        uint256 finalBaseBalance = baseTokenContract.balanceOf(msg.sender);
        uint256 sniperTokenBalance = IERC20(tokenToSnipe).balanceOf(sniperAddress);
        
        console.log("Base token spent:", initialBaseBalance - finalBaseBalance);
        console.log("Target token acquired:", sniperTokenBalance);
    }
}
