// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract Sniper {
    address public owner;
    address public factory;
    
    constructor(address _factory) {
        owner = msg.sender;
        factory = _factory;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Sniper: caller is not the owner");
        _;
    }
    
    // Snipe a token when liquidity is added
    function snipeToken(
        address tokenToSnipe,
        address baseToken, 
        uint256 amountIn, 
        uint256 minAmountOut
    ) external onlyOwner {
        // Get the pair address
        address pair = IUniswapV2Factory(factory).getPair(tokenToSnipe, baseToken);
        require(pair != address(0), "Sniper: pair doesn't exist");
        
        // Transfer base token from sender to contract
        IERC20(baseToken).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve pair to spend base token
        IERC20(baseToken).approve(pair, amountIn);
        
        // Determine which token is token0
        address token0 = IUniswapV2Pair(pair).token0();
        
        // Calculate expected amounts based on which token is token0
        uint256 amount0Out = 0;
        uint256 amount1Out = 0;
        
        if (token0 == tokenToSnipe) {
            amount0Out = minAmountOut;
        } else {
            amount1Out = minAmountOut;
        }
        
        // Execute the swap
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), bytes(""));
    }
    
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Sniper: new owner is the zero address");
        owner = newOwner;
    }
    
    receive() external payable {}
}
