// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../../src/interfaces/IUniswapV2Router02.sol";
// Use OpenZeppelin's IERC20 interface instead of our custom one
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SniperSimulator
 * @dev Simulates sniper transactions that occur in the same block as liquidity addition
 */
contract SniperSimulator is Script {
    /**
     * @notice Executes a series of sniper transactions
     * @param pair The Uniswap V2 pair address
     * @param token The token address
     * @param weth The WETH address
     * @param router The Uniswap V2 router address
     * @param snipers Array of sniper addresses
     */
    function executeSnipes(
        address pair,
        address token,
        address weth,
        address router,
        address[] memory snipers
    ) external {
        // Use different private keys based on the provided sniper addresses
        uint256[] memory privateKeys = _getSniperKeys();
        require(privateKeys.length >= snipers.length, "Not enough private keys");
        
        for (uint i = 0; i < snipers.length; i++) {
            // Verify the key matches the sniper address
            address derivedAddress = vm.addr(privateKeys[i]);
            require(derivedAddress == snipers[i], "Private key doesn't match the sniper address");
            
            // Prepare the path
            address[] memory path = new address[](2);
            path[0] = weth;
            path[1] = token;
            
            // Calculate different ETH amounts for different snipers
            uint256 ethAmount = _calculateSniperAmount(i);
            
            vm.startBroadcast(privateKeys[i]);
            
            // Execute the sniper swap
            IUniswapV2Router02 routerContract = IUniswapV2Router02(router);
            uint256[] memory amounts = routerContract.swapExactETHForTokens{value: ethAmount}(
                0, // accept any amount of tokens
                path,
                snipers[i],
                block.timestamp + 3600
            );
            
            console.log("Sniper #", i, "executed swap:");
            console.log("- Address:", snipers[i]);
            console.log("- ETH spent:", ethAmount);
            console.log("- Tokens received:", amounts[1]);
            
            vm.stopBroadcast();
        }
    }
    
    /**
     * @notice Returns an array of private keys for the snipers
     * @dev These are the default anvil private keys 1-5
     */
    function _getSniperKeys() private pure returns (uint256[] memory) {
        uint256[] memory keys = new uint256[](5);
        keys[0] = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // anvil account 1
        keys[1] = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a; // anvil account 2
        keys[2] = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6; // anvil account 3
        keys[3] = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a; // anvil account 4
        keys[4] = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba; // anvil account 5
        return keys;
    }
    
    /**
     * @notice Calculates a different ETH amount for each sniper
     * @param sniperIndex The index of the sniper in the array
     */
    function _calculateSniperAmount(uint256 sniperIndex) private pure returns (uint256) {
        // First sniper is a "whale" with a large buy
        if (sniperIndex == 0) {
            return 3 ether;
        }
        
        // Other snipers make smaller purchases
        return (1 ether + sniperIndex * 0.5 ether);
    }
}