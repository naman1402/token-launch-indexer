// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

/**
 * @title FundingSimulator
 * @dev Simulates multi-level funding transactions to create funding history
 */
contract FundingSimulator is Script {
    // Test accounts with default anvil private keys
    uint256 constant private LEVEL1_KEY = 0xd293c684d884d56f8d6abd64fc76757d3664904e309a0645baf8522ab6366d9e; // anvil account 9
    uint256 constant private LEVEL2_KEY = 0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd; // anvil account 10
    uint256 constant private LEVEL3_KEY = 0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa; // anvil account 11
    
    // Deployer key (first Anvil account)
    uint256 constant private DEPLOYER_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // anvil account 0

    // Addresses derived from the above keys
    address public level1Funder;
    address public level2Funder;
    address public level3Funder;
    
    function createFundingHistory(address target) external {
        // Initialize the funders
        level1Funder = vm.addr(LEVEL1_KEY);
        level2Funder = vm.addr(LEVEL2_KEY);
        level3Funder = vm.addr(LEVEL3_KEY);
        
        console.log("Creating funding history:");
        console.log("- Level 1 funder: ", level1Funder);
        console.log("- Level 2 funder: ", level2Funder);
        console.log("- Level 3 funder: ", level3Funder);
        console.log("- Target: ", target);
        
        // USE VM.DEAL TO FUND THE ACCOUNTS DIRECTLY
        // This is the key fix - give ETH to all accounts that need it
        vm.deal(level1Funder, 10 ether);
        vm.deal(level2Funder, 10 ether);
        vm.deal(level3Funder, 10 ether);
        
        // Create the 3-level funding chain: level3 -> level2 -> level1 -> target
        
        // Level 3 funds level 2
        vm.startBroadcast(LEVEL3_KEY);
        payable(level2Funder).transfer(4 ether);
        vm.stopBroadcast();
        
        // Level 2 funds level 1
        vm.startBroadcast(LEVEL2_KEY);
        payable(level1Funder).transfer(3 ether);
        vm.stopBroadcast();
        
        // Level 1 funds target (typically token deployer)
        vm.startBroadcast(LEVEL1_KEY);
        payable(target).transfer(2 ether);
        vm.stopBroadcast();
        
        console.log("Funding history created successfully");
    }
}