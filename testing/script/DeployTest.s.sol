// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/TestToken.sol";
import "../src/interfaces/IUniswapV2Factory.sol";
import "../src/interfaces/IUniswapV2Pair.sol";
import "../src/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./helpers/FundingSimulator.sol";

/**
 * @title DeployTest
 * @dev Main script to test the Uniswap V2 token launch indexer with all scenarios
 *      Uses REAL contract interactions instead of manual event emissions
 */
contract DeployTestScript is Script {
    using Strings for uint256;

    // Mainnet addresses (Will be used to get contract instances)
    address constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // Test parameters
    uint256 constant ETH_AMOUNT = 10 ether;
    uint256 constant TOKEN_AMOUNT = 1_000_000 ether; // 1M tokens
    
    // Anvil private keys for account access
    uint256 constant DEPLOYER_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256[5] sniperKeys = [
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d, // anvil account 1
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a, // anvil account 2
        0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6, // anvil account 3
        0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a, // anvil account 4
        0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba  // anvil account 5
    ];
    uint256[3] teamKeys = [
        0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e, // anvil account 6
        0x4bbbf85ce3377467b1ce8c68776e769aa7d0a5aa329a71e5ef5c5eb52d1e2ff1, // anvil account 7
        0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97  // anvil account 8
    ];
    
    // Key participants
    address deployer;
    address[] public snipers;
    address[] public teamMembers;

    // Deployed contract addresses
    TestToken token;
    address pair;
    
    /**
     * @notice Main entry point that orchestrates the entire test flow
     */
    function run() external {
        // Setup accounts
        _setupAccounts();
        
        // Deploy token with funding history
        _deployTokenWithFunding();
        
        // Create pair and add initial liquidity - using REAL contract calls
        _createPairAndAddLiquidity();
        
        // Simulate sniper transactions - using REAL swaps
        _simulateSnipingActivity();
        
        // Simulate team bundle - using REAL swaps in consecutive blocks
        _simulateTeamBundleActivity();
        
        // Simulate regular trading - using REAL swaps
        _simulateRegularTrading();
        
        // Print summary of all actions performed
        _printTestSummary();
    }
    
    /**
     * @notice Sets up all accounts needed for testing
     */
    function _setupAccounts() internal {
        deployer = vm.addr(DEPLOYER_PRIVATE_KEY);
        console2.log("Deployer address:", deployer);
        
        // Give deployer plenty of ETH
        vm.deal(deployer, 100 ether);
        
        // Setup snipers
        snipers = new address[](5);
        for (uint i = 0; i < snipers.length; i++) {
            snipers[i] = vm.addr(sniperKeys[i]);
            vm.deal(snipers[i], 10 ether);
        }
        
        // Setup team members
        teamMembers = new address[](3);
        for (uint i = 0; i < teamMembers.length; i++) {
            teamMembers[i] = vm.addr(teamKeys[i]);
            vm.deal(teamMembers[i], 10 ether);
        }
        
        console2.log("Accounts setup complete");
    }
    
    /**
     * @notice Creates funding history for the deployer to simulate token creation with funding
     */
    function _deployTokenWithFunding() internal {
        // Simulate funding transfers to the deployer (3 levels)
        console2.log("Creating funding history:");
        FundingSimulator fundingSim = new FundingSimulator();
        fundingSim.createFundingHistory(deployer);
        
        // Deploy the test token
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        token = new TestToken("Test Token", "TEST", 10_000_000); // 10M tokens
        vm.stopBroadcast();
        
        console2.log("TestToken deployed at:", address(token));
    }
    
    /**
     * @notice Creates a Uniswap V2 pair and adds initial liquidity
     *         Using REAL contract interactions instead of manual event emissions
     */
    function _createPairAndAddLiquidity() internal {
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        // Create pair through Factory contract - this will emit PairCreated event
        IUniswapV2Factory factory = IUniswapV2Factory(FACTORY);
        pair = factory.createPair(address(token), WETH);
        console2.log("Pair created at:", pair);
        
        // Approve tokens for router
        token.approve(ROUTER, TOKEN_AMOUNT);
        
        // Add liquidity through Router - this will emit Mint event
        IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
        
        // addLiquidityETH function parameters:
        // token: address - The token to add liquidity for
        // amountTokenDesired: uint - The amount of token to add as liquidity
        // amountTokenMin: uint - The minimum amount of token to add as liquidity
        // amountETHMin: uint - The minimum amount of ETH to add as liquidity
        // to: address - Recipient of the liquidity tokens
        // deadline: uint - Unix timestamp after which the transaction will revert
        router.addLiquidityETH{value: ETH_AMOUNT}(
            address(token),
            TOKEN_AMOUNT,
            0, // amountTokenMin - No minimum (accept any slippage)
            0, // amountETHMin - No minimum (accept any slippage)
            deployer,
            block.timestamp + 100 // deadline
        );
        
        console2.log("Added liquidity (real interaction):");
        console2.log("- Token amount:", TOKEN_AMOUNT);
        console2.log("- ETH amount:", ETH_AMOUNT);
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Simulates sniper transactions that happen in the same block as liquidity
     *         Using REAL swaps instead of manual event emissions
     */
    function _simulateSnipingActivity() internal {
        // For each sniper, perform a real swap through the router
        for (uint i = 0; i < snipers.length; i++) {
            uint256 ethAmount = (i + 1) * 0.5 ether;
            
            vm.startBroadcast(sniperKeys[i]);
            
            // Set up swap path
            address[] memory path = new address[](2);
            path[0] = WETH;
            path[1] = address(token);
            
            // Execute swap through Router - this will emit Swap event
            IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
            
            // swapExactETHForTokens function parameters:
            // amountOutMin: uint - The minimum amount of output tokens to receive
            // path: address[] - An array of token addresses determining the swap path
            // to: address - Recipient of the output tokens
            // deadline: uint - Unix timestamp after which the transaction will revert
            router.swapExactETHForTokens{value: ethAmount}(
                0, // amountOutMin - No minimum (accept any slippage)
                path,
                snipers[i],
                block.timestamp + 100 // deadline
            );
            
            vm.stopBroadcast();
        }
        
        console2.log("Sniping activity simulated with real swaps");
    }
    
    /**
     * @notice Simulates team bundle transactions that happen right after launch
     *         Using REAL swaps instead of manual event emissions
     */
    function _simulateTeamBundleActivity() internal {
        // Move forward 1 block to simulate post-launch activity
        vm.roll(block.number + 1);
        
        // For each team member, perform a real swap through the router
        for (uint i = 0; i < teamMembers.length; i++) {
            uint256 ethAmount = (i + 1) * 0.3 ether;
            
            vm.startBroadcast(teamKeys[i]);
            
            // Set up swap path
            address[] memory path = new address[](2);
            path[0] = WETH;
            path[1] = address(token);
            
            // Execute swap through Router - this will emit Swap event
            IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
            router.swapExactETHForTokens{value: ethAmount}(
                0, // amountOutMin - No minimum
                path,
                teamMembers[i],
                block.timestamp + 100 // deadline
            );
            
            vm.stopBroadcast();
        }
        
        console2.log("Team bundle activity simulated with real swaps");
    }
    
    /**
     * @notice Simulates some regular trading activity after launch
     *         Using REAL swaps instead of manual event emissions
     */
    function _simulateRegularTrading() internal {
        // Move forward several blocks for normal trading
        vm.roll(block.number + 5);
        
        // Regular buy
        uint256 buyEthAmount = 0.5 ether;
        
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        // Setup buy path
        address[] memory buyPath = new address[](2);
        buyPath[0] = WETH;
        buyPath[1] = address(token);
        
        // Execute buy swap - this will emit Swap event
        IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
        uint[] memory amounts = router.swapExactETHForTokens{value: buyEthAmount}(
            0, // amountOutMin - No minimum
            buyPath,
            deployer,
            block.timestamp + 100 // deadline
        );
        
        console2.log("Regular buy complete:");
        console2.log("- ETH spent:", buyEthAmount);
        console2.log("- Tokens received:", amounts[1]);
        
        vm.stopBroadcast();
        
        // Regular sell - after a short delay
        vm.roll(block.number + 3);
        
        uint256 sellTokenAmount = 50_000 ether;
        
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        // Approve tokens for selling
        token.approve(ROUTER, sellTokenAmount);
        
        // Setup sell path
        address[] memory sellPath = new address[](2);
        sellPath[0] = address(token);
        sellPath[1] = WETH;
        
        // Execute sell swap - this will emit Swap event
        uint[] memory sellAmounts = router.swapExactTokensForETH(
            sellTokenAmount,
            0, // amountOutMin - No minimum
            sellPath,
            deployer,
            block.timestamp + 100 // deadline
        );
        
        console2.log("Regular sell complete:");
        console2.log("- Tokens sold:", sellTokenAmount);
        console2.log("- ETH received:", sellAmounts[1]);
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Prints a summary of the test scenario
     */
    function _printTestSummary() internal view {
        console2.log("==========================================");
        console2.log("     TOKEN LAUNCH INDEXER TEST SUMMARY    ");
        console2.log("==========================================");
        console2.log("Token Address:", address(token));
        console2.log("Pair Address:", pair);
        
        // Fix: Use string concatenation for the LP information
        string memory ethAmountStr = Strings.toString(ETH_AMOUNT);
        string memory tokenAmountStr = Strings.toString(TOKEN_AMOUNT);
        string memory lpInfo = string(abi.encodePacked(
            "Initial LP: ", 
            ethAmountStr,
            " ETH + ",
            tokenAmountStr,
            " Tokens"
        ));
        console2.log(lpInfo);
        
        console2.log("Number of Snipers:", snipers.length);
        console2.log("Team Bundle Members:", teamMembers.length);
        console2.log("==========================================");
        console2.log("The indexer should now have captured:");
        console2.log("1. Token metadata and deployer");
        console2.log("2. Initial liquidity amount");
        console2.log("3. Sniper transactions in launch block");
        console2.log("4. Team bundle activity post-launch");
        console2.log("5. Funding history for the token deployer");
        console2.log("==========================================");
    }
}