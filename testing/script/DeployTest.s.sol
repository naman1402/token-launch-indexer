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
import "./helpers/SniperSimulator.sol";
import "./helpers/TeamBundleSimulator.sol";

/**
 * @title DeployTest
 * @dev Main script to test the Uniswap V2 token launch indexer with all scenarios
 */
contract DeployTestScript is Script {
    using Strings for uint256;
    using Strings for address;

    // Mainnet addresses
    address constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // For mainnet forking tests
    uint256 constant ETH_AMOUNT = 10 ether;
    uint256 constant TOKEN_AMOUNT = 1_000_000 ether; // 1M tokens
    
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
        // Setup accounts and fund them
        _setupAccounts();
        
        // Deploy token with funding history
        _deployTokenWithFunding();
        
        // Create pair and add initial liquidity
        _createPairAndAddLiquidity();
        
        // Simulate sniper transactions (happens in the same block as LP)
        _simulateSnipingActivity();
        
        // Simulate team bundle (happens right after launch)
        _simulateTeamBundleActivity();
        
        // Simulate regular trading activity
        _simulateRegularTrading();
        
        // Print summary of all actions performed
        _printTestSummary();
    }
    
    /**
     * @notice Sets up all accounts needed for testing
     */
    function _setupAccounts() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Default to first anvil account if no private key is provided
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        
        deployer = vm.addr(deployerPrivateKey);
        console2.log("Deployer address:", deployer);
        
        // Create snipers (using accounts 1-5)
        snipers = new address[](5);
        snipers[0] = vm.addr(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d); // anvil account 1
        snipers[1] = vm.addr(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a); // anvil account 2
        snipers[2] = vm.addr(0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6); // anvil account 3
        snipers[3] = vm.addr(0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a); // anvil account 4
        snipers[4] = vm.addr(0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba); // anvil account 5
        
        // Create team members (using accounts 6-8)
        teamMembers = new address[](3);
        teamMembers[0] = vm.addr(0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e); // anvil account 6
        teamMembers[1] = vm.addr(0x4bbbf85ce3377467b1ce8c68776e769aa7d0a5aa329a71e5ef5c5eb52d1e2ff1); // anvil account 7
        teamMembers[2] = vm.addr(0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97); // anvil account 8
        
        // Fund all accounts with ETH
        vm.startBroadcast(deployerPrivateKey);
        
        // Fund snipers
        for (uint i = 0; i < snipers.length; i++) {
            payable(snipers[i]).transfer(5 ether);
        }
        
        // Fund team members
        for (uint i = 0; i < teamMembers.length; i++) {
            payable(teamMembers[i]).transfer(3 ether);
        }
        
        vm.stopBroadcast();
        
        console2.log("Accounts setup complete");
    }
    
    /**
     * @notice Creates funding history for the deployer to simulate token creation with funding
     */
    function _deployTokenWithFunding() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        
        // Simulate funding transfers to the deployer (3 levels)
        // This will create the funding history that our indexer should detect
        FundingSimulator fundingSim = new FundingSimulator();
        fundingSim.createFundingHistory(deployer);
        
        // Deploy the test token
        vm.startBroadcast(deployerPrivateKey);
        
        token = new TestToken("Test Token", "TEST", 10_000_000); // 10M tokens
        console2.log("TestToken deployed at:", address(token));
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Creates a Uniswap V2 pair and adds initial liquidity
     */
    function _createPairAndAddLiquidity() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Create pair with Uniswap V2 Factory
        IUniswapV2Factory factory = IUniswapV2Factory(FACTORY);
        pair = factory.createPair(address(token), WETH);
        console2.log("Pair created at:", pair);
        
        // 2. Approve tokens for router
        token.approve(ROUTER, type(uint256).max);
        
        // 3. Add liquidity
        IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
        
        (uint256 tokenAmount, uint256 ethAmount, uint256 liquidity) = router.addLiquidityETH{value: ETH_AMOUNT}(
            address(token),
            TOKEN_AMOUNT,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            deployer,
            block.timestamp + 3600
        );
        
        console2.log("Added liquidity:");
        console2.log("- Token amount:", tokenAmount);
        console2.log("- ETH amount:", ethAmount);
        console2.log("- Liquidity tokens:", liquidity);
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Simulates sniper transactions that happen in the same block as liquidity
     * This is crucial for the indexer to detect sniping activity
     */
    function _simulateSnipingActivity() internal {
        SniperSimulator sniperSim = new SniperSimulator();
        sniperSim.executeSnipes(
            pair, 
            address(token), 
            WETH, 
            ROUTER, 
            snipers
        );
        
        console2.log("Sniping activity simulated");
    }
    
    /**
     * @notice Simulates team bundle transactions that happen right after launch
     */
    function _simulateTeamBundleActivity() internal {
        // Move forward 1-2 blocks to simulate post-launch activity
        vm.roll(block.number + 1);
        
        TeamBundleSimulator teamSim = new TeamBundleSimulator();
        teamSim.executeTeamBundle(
            pair,
            address(token),
            WETH,
            ROUTER,
            teamMembers
        );
        
        console2.log("Team bundle activity simulated");
    }
    
    /**
     * @notice Simulates some regular trading activity after launch
     */
    function _simulateRegularTrading() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        
        // Move forward several blocks for normal trading
        vm.roll(block.number + 5);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Regular buy
        IUniswapV2Router02 router = IUniswapV2Router02(ROUTER);
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = address(token);
        
        uint256[] memory amounts = router.swapExactETHForTokens{value: 0.5 ether}(
            0, // accept any amount of tokens
            path,
            deployer,
            block.timestamp + 3600
        );
        
        console2.log("Regular buy complete:");
        string memory message = string(abi.encodePacked("- ETH spent: ", Strings.toString(0.5 ether)));
        console2.log(message);
        console2.log("- Tokens received:", amounts[1]);
        
        // Regular sell
        path[0] = address(token);
        path[1] = WETH;
        
        token.approve(ROUTER, 50_000 ether);
        
        amounts = router.swapExactTokensForETH(
            50_000 ether, // sell 50k tokens
            0, // accept any amount of ETH
            path,
            deployer,
            block.timestamp + 3600
        );
        
        console2.log("Regular sell complete:");
        string memory message2 = string(abi.encodePacked("- Tokens sold: ", Strings.toString(50_000 ether)));
        console2.log(message2);
        string memory message3 = string(abi.encodePacked("- ETH received: ", Strings.toString(amounts[1])));
        console2.log(message3);
        
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
        string memory message4 = string(abi.encodePacked("Initial LP: ", Strings.toString(ETH_AMOUNT), " ETH + ", Strings.toString(TOKEN_AMOUNT), " Tokens"));
        console2.log(message4);
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