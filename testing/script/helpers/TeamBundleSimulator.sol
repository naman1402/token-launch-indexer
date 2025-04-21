// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../../src/interfaces/IUniswapV2Router02.sol";
// Use OpenZeppelin's IERC20 interface instead of our custom one
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TeamBundleSimulator
 * @dev Simulates team bundle transactions that occur in blocks right after the launch
 * Team bundles are typically a series of transactions from related addresses in
 * close proximity (block-wise) that often indicate team/insider activity
 */
contract TeamBundleSimulator is Script {
    /**
     * @notice Executes a series of team bundle transactions
     * @param pair The Uniswap V2 pair address
     * @param token The token address
     * @param weth The WETH address
     * @param router The Uniswap V2 router address
     * @param teamMembers Array of team member addresses
     */
    function executeTeamBundle(
        address pair,
        address token,
        address weth,
        address router,
        address[] memory teamMembers
    ) external {
        // Use different private keys based on the provided team member addresses
        uint256[] memory privateKeys = _getTeamMemberKeys();
        require(privateKeys.length >= teamMembers.length, "Not enough private keys");
        
        // First, execute buys from all team members
        for (uint i = 0; i < teamMembers.length; i++) {
            // Verify the key matches the team member address
            address derivedAddress = vm.addr(privateKeys[i]);
            require(derivedAddress == teamMembers[i], "Private key doesn't match the team member address");
            
            // Prepare the path for buying
            address[] memory buyPath = new address[](2);
            buyPath[0] = weth;
            buyPath[1] = token;
            
            // Execute the buy transaction
            vm.startBroadcast(privateKeys[i]);
            
            uint256 ethAmount = 1 ether;
            IUniswapV2Router02 routerContract = IUniswapV2Router02(router);
            uint256[] memory amounts = routerContract.swapExactETHForTokens{value: ethAmount}(
                0, // accept any amount of tokens
                buyPath,
                teamMembers[i],
                block.timestamp + 3600
            );
            
            console.log("Team member #", i, "executed buy:");
            console.log("- Address:", teamMembers[i]);
            console.log("- ETH spent:", ethAmount);
            console.log("- Tokens received:", amounts[1]);
            
            vm.stopBroadcast();
        }
        
        // Move forward a small number of blocks to simulate close proximity
        vm.roll(block.number + 1);
        
        // Then, execute sells from team members to simulate a coordinated pump and dump
        for (uint i = 0; i < teamMembers.length; i++) {
            // Prepare the path for selling
            address[] memory sellPath = new address[](2);
            sellPath[0] = token;
            sellPath[1] = weth;
            
            vm.startBroadcast(privateKeys[i]);
            
            // Get current token balance
            IERC20 tokenContract = IERC20(token);
            uint256 tokenBalance = tokenContract.balanceOf(teamMembers[i]);
            
            // Approve tokens for selling
            tokenContract.approve(router, tokenBalance / 2); // Sell half of the tokens
            
            // Execute the sell transaction
            IUniswapV2Router02 routerContract = IUniswapV2Router02(router);
            uint256[] memory amounts = routerContract.swapExactTokensForETH(
                tokenBalance / 2, // Sell half of the tokens
                0, // accept any amount of ETH
                sellPath,
                teamMembers[i],
                block.timestamp + 3600
            );
            
            console.log("Team member #", i, "executed sell:");
            console.log("- Address:", teamMembers[i]);
            console.log("- Tokens sold:", tokenBalance / 2);
            console.log("- ETH received:", amounts[1]);
            
            vm.stopBroadcast();
            
            // If not the last team member, advance the block to simulate transactions in close proximity
            if (i < teamMembers.length - 1) {
                vm.roll(block.number + 1);
            }
        }
    }
    
    /**
     * @notice Returns an array of private keys for the team members
     * @dev These are the default anvil private keys 6-8
     */
    function _getTeamMemberKeys() private pure returns (uint256[] memory) {
        uint256[] memory keys = new uint256[](3);
        keys[0] = 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e; // anvil account 6
        keys[1] = 0x4bbbf85ce3377467b1ce8c68776e769aa7d0a5aa329a71e5ef5c5eb52d1e2ff1; // anvil account 7
        keys[2] = 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97; // anvil account 8
        return keys;
    }
}