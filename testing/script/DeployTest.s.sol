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
    
    // Anvil private key for deployer (first account)
    uint256 constant DEPLOYER_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    // Key participants
    address deployer;
    address[] public snipers;
    address[] public teamMembers;

    // Deployed contract addresses
    TestToken token;
    address pair;
    
    // Events we need to emit manually
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event Mint(address indexed sender, uint amount0, uint amount1);
    event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to);
    
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
        deployer = vm.addr(DEPLOYER_PRIVATE_KEY);
        console2.log("Deployer address:", deployer);
        
        // Give deployer plenty of ETH
        vm.deal(deployer, 100 ether);
        
        // Create snipers (using accounts 1-5)
        snipers = new address[](5);
        snipers[0] = vm.addr(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d); // anvil account 1
        snipers[1] = vm.addr(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a); // anvil account 2
        snipers[2] = vm.addr(0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6); // anvil account 3
        snipers[3] = vm.addr(0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a); // anvil account 4
        snipers[4] = vm.addr(0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba); // anvil account 5
        
        // Use vm.deal for snipers instead of transfer
        for (uint i = 0; i < snipers.length; i++) {
            vm.deal(snipers[i], 10 ether);
        }
        
        // Create team members (using accounts 6-8)
        teamMembers = new address[](3);
        teamMembers[0] = vm.addr(0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e); // anvil account 6
        teamMembers[1] = vm.addr(0x4bbbf85ce3377467b1ce8c68776e769aa7d0a5aa329a71e5ef5c5eb52d1e2ff1); // anvil account 7
        teamMembers[2] = vm.addr(0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97); // anvil account 8
        
        // Use vm.deal for team members instead of transfer
        for (uint i = 0; i < teamMembers.length; i++) {
            vm.deal(teamMembers[i], 10 ether);
        }
        
        console2.log("Accounts setup complete");
    }
    
    /**
     * @notice Creates funding history for the deployer to simulate token creation with funding
     */
    function _deployTokenWithFunding() internal {
        // Simulate funding transfers to the deployer (3 levels)
        // This will create the funding history that our indexer should detect
        FundingSimulator fundingSim = new FundingSimulator();
        fundingSim.createFundingHistory(deployer);
        
        // Deploy the test token
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        token = new TestToken("Test Token", "TEST", 10_000_000); // 10M tokens
        console2.log("TestToken deployed at:", address(token));
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Creates a Uniswap V2 pair and adds initial liquidity
     * Using deterministic pair address calculation to avoid actual factory call
     */
    function _createPairAndAddLiquidity() internal {
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        // Instead of calling factory.createPair, calculate the pair address deterministically
        // This is how Uniswap V2 calculates pair addresses
        bytes32 salt = keccak256(abi.encodePacked(
            address(token) < WETH ? address(token) : WETH,
            address(token) < WETH ? WETH : address(token)
        ));
        
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            FACTORY,
            salt,
            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"
        )))));
        
        console2.log("Pair address computed:", pair);
        
        // Emit the PairCreated event manually for our indexer using our local event definition
        emit PairCreated(address(token), WETH, pair, 0);
        console2.log("PairCreated event emitted");
        
        // Approve tokens for router
        token.approve(ROUTER, TOKEN_AMOUNT);
        
        // Emit a Mint event directly (what our indexer is looking for)
        emit Mint(deployer, TOKEN_AMOUNT, ETH_AMOUNT);
        
        console2.log("Added liquidity (mocked):");
        console2.log("- Token amount:", TOKEN_AMOUNT);
        console2.log("- ETH amount:", ETH_AMOUNT);
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Simulates sniper transactions that happen in the same block as liquidity
     */
    function _simulateSnipingActivity() internal {
        // For each sniper, emit a Swap event directly
        for (uint i = 0; i < snipers.length; i++) {
            // Each sniper buys tokens with varying amounts
            uint256 ethAmount = (i + 1) * 0.5 ether;
            uint256 tokenAmount = ethAmount * 1000; // Simple conversion rate
            
            vm.startBroadcast(vm.addr(DEPLOYER_PRIVATE_KEY));
            
            // Emit a Swap event for our indexer using our local event definition
            emit Swap(
                snipers[i],  // sender
                ethAmount,   // amount0In (ETH in)
                0,           // amount1In
                0,           // amount0Out
                tokenAmount, // amount1Out (tokens out)
                snipers[i]   // to
            );
            
            vm.stopBroadcast();
        }
        
        console2.log("Sniping activity simulated");
    }
    
    /**
     * @notice Simulates team bundle transactions that happen right after launch
     */
    function _simulateTeamBundleActivity() internal {
        // Move forward 1 block to simulate post-launch activity
        vm.roll(block.number + 1);
        
        // For each team member, emit a Swap event
        for (uint i = 0; i < teamMembers.length; i++) {
            uint256 ethAmount = (i + 1) * 0.3 ether;
            uint256 tokenAmount = ethAmount * 1200; // Different rate for team members
            
            vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
            
            // Emit a Swap event for our indexer using our local event definition
            emit Swap(
                teamMembers[i], // sender
                ethAmount,      // amount0In (ETH in)
                0,              // amount1In
                0,              // amount0Out
                tokenAmount,    // amount1Out (tokens out)
                teamMembers[i]  // to
            );
            
            vm.stopBroadcast();
        }
        
        console2.log("Team bundle activity simulated");
    }
    
    /**
     * @notice Simulates some regular trading activity after launch
     */
    function _simulateRegularTrading() internal {
        // Move forward several blocks for normal trading
        vm.roll(block.number + 5);
        
        vm.startBroadcast(DEPLOYER_PRIVATE_KEY);
        
        // Regular buy
        uint256 buyEthAmount = 0.5 ether;
        uint256 buyTokenAmount = buyEthAmount * 900; // Rate changes over time
        
        // Emit a Swap event for the buy using our local event definition
        emit Swap(
            deployer,      // sender
            buyEthAmount,  // amount0In (ETH in)
            0,             // amount1In
            0,             // amount0Out
            buyTokenAmount,// amount1Out (tokens out)
            deployer       // to
        );
        
        console2.log("Regular buy complete:");
        console2.log("- ETH spent:", buyEthAmount);
        console2.log("- Tokens received:", buyTokenAmount);
        
        // Regular sell
        uint256 sellTokenAmount = 50_000 ether;
        uint256 sellEthAmount = sellTokenAmount / 1000; // Different rate for selling
        
        // Emit a Swap event for the sell using our local event definition
        emit Swap(
            deployer,       // sender
            0,              // amount0In
            sellTokenAmount,// amount1In (tokens in)
            sellEthAmount,  // amount0Out (ETH out)
            0,              // amount1Out
            deployer        // to
        );
        
        console2.log("Regular sell complete:");
        console2.log("- Tokens sold:", sellTokenAmount);
        console2.log("- ETH received:", sellEthAmount);
        
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
        string memory lpInfo = string(abi.encodePacked(
            "Initial LP: ", 
            Strings.toString(ETH_AMOUNT), 
            " ETH + ", 
            Strings.toString(TOKEN_AMOUNT), 
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