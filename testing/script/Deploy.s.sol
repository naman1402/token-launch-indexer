// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.29;

import "forge-std/Script.sol";
import "../src/core/UniswapV2Factory.sol";
import "../src/tokens/WETH9.sol";
import "../src/tokens/TokenFactory.sol";
import "../src/helper/TestScenario.sol";

contract DeployScript is Script {
    // Store deployment addresses
    struct DeployedContracts {
        address weth;
        address factory;
        address tokenFactory;
        address testScenario;
        address memeToken;
        address pair;
    }

    function run() external returns (DeployedContracts memory) {
        // Using Anvil's first default private key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        // Create sniper accounts with known private keys
        uint256[] memory sniperKeys = new uint256[](3);
        sniperKeys[0] = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // Anvil #2
        sniperKeys[1] = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a; // Anvil #3
        sniperKeys[2] = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6; // Anvil #4
        
        address[] memory snipers = new address[](3);
        for(uint i = 0; i < sniperKeys.length; i++) {
            snipers[i] = vm.addr(sniperKeys[i]);
        }

        vm.startBroadcast(deployerPrivateKey);

        // Deploy base contracts
        WETH9 weth = new WETH9();
        UniswapV2Factory factory = new UniswapV2Factory(msg.sender);
        TokenFactory tokenFactory = new TokenFactory();
        
        // Deploy test scenario helper
        TestScenario testScenario = new TestScenario(
            address(factory),
            address(tokenFactory),
            address(weth)
        );

        // Fund test scenario contract
        payable(address(testScenario)).transfer(100 ether);

        // Create and launch a meme token
        TestScenario.LaunchInfo memory launchInfo = testScenario.launchTokenWithLiquidity{value: 10 ether}(
            "Meme Token",
            "MEME",
            1_000_000 ether, // 1M tokens
            10 ether  // 10 ETH liquidity
        );

        // Fund snipers
        for(uint i = 0; i < snipers.length; i++) {
            payable(snipers[i]).transfer(5 ether);
        }

        vm.stopBroadcast();

        // Execute snipes from different addresses
        for(uint i = 0; i < snipers.length; i++) {
            vm.startBroadcast(sniperKeys[i]);
            testScenario.snipe{value: 1 ether}(
                launchInfo.pair,
                1 ether,  // Spend 1 ETH
                0         // Accept any amount of tokens
            );
            vm.stopBroadcast();
        }

        DeployedContracts memory contracts = DeployedContracts({
            weth: address(weth),
            factory: address(factory),
            tokenFactory: address(tokenFactory),
            testScenario: address(testScenario),
            memeToken: launchInfo.token,
            pair: launchInfo.pair
        });

        // Create JSON string with deployment addresses
        string memory deploymentJson = string(
            abi.encodePacked(
                '{\n',
                '    "weth": "', vm.toString(contracts.weth), '",\n',
                '    "factory": "', vm.toString(contracts.factory), '",\n',
                '    "tokenFactory": "', vm.toString(contracts.tokenFactory), '",\n',
                '    "testScenario": "', vm.toString(contracts.testScenario), '",\n',
                '    "memeToken": "', vm.toString(contracts.memeToken), '",\n',
                '    "pair": "', vm.toString(contracts.pair), '"\n',
                '}'
            )
        );

        // Output to console for manual copying
        console.log("=== Deployment Addresses ===");
        console.log(deploymentJson);
        console.log("=== Copy the above JSON to testing/deployments.json ===");

        return contracts;
    }
}