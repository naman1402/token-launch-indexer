// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import "../src/Sniper.sol";
import "../src/interfaces/IERC20.sol";
import "../src/interfaces/IUniswapV2Factory.sol";
import "../src/interfaces/IUniswapV2Pair.sol";
import "../src/interfaces/IUniswapV2Router02.sol";
import "forge-std/console.sol";

contract SimulateTokenLaunchScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 sniperPrivateKey = vm.envUint("SNIPER_PRIVATE_KEY");
        address uniswapFactory = vm.envAddress("UNISWAP_FACTORY");
        address uniswapRouter = vm.envAddress("UNISWAP_ROUTER");
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");
        address baseToken = vm.envAddress("BASE_TOKEN"); // Usually WETH
        
        uint256 liquidityAmount = vm.envUint("LIQUIDITY_AMOUNT");
        uint256 snipeAmount = vm.envUint("SNIPE_AMOUNT");
        uint256 minAmountOut = vm.envUint("MIN_AMOUNT_OUT");
        
        IERC20 token = IERC20(tokenAddress);
        IERC20 weth = IERC20(baseToken);
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        
        // Deploy sniper
        vm.startBroadcast(sniperPrivateKey);
        Sniper sniper = new Sniper(uniswapFactory);
        vm.stopBroadcast();
        
        console.log("Sniper deployed at:", address(sniper));
        
        // Fund sniper with base token
        vm.startBroadcast(sniperPrivateKey);
        weth.approve(address(sniper), snipeAmount);
        vm.stopBroadcast();
        
        // Simulate token creator adding liquidity
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve router to spend tokens
        token.approve(uniswapRouter, liquidityAmount);
        weth.approve(uniswapRouter, liquidityAmount);
        
        // Add liquidity
        router.addLiquidity(
            tokenAddress,
            baseToken,
            liquidityAmount,
            liquidityAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 3600
        );
        
        vm.stopBroadcast();
        
        console.log("Liquidity added for token:", tokenAddress);
        
        // Warp block.timestamp to simulate waiting for the right moment
        vm.warp(block.timestamp + 60);
        
        // Execute snipe
        vm.startBroadcast(sniperPrivateKey);
        sniper.snipeToken(tokenAddress, baseToken, snipeAmount, minAmountOut);
        vm.stopBroadcast();
        
        // Check results
        uint256 snipedAmount = token.balanceOf(address(sniper));
        console.log("Sniped token amount:", snipedAmount);
    }
}
