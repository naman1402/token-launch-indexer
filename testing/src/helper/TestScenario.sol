// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.29;

import "../tokens/TokenFactory.sol";
import "../core/interfaces/IUniswapV2Factory.sol";
import "../core/interfaces/IUniswapV2Pair.sol";
import "../core/interfaces/IERC20Basic.sol";
import "../tokens/WETH9.sol";

contract TestScenario {
    IUniswapV2Factory public immutable factory;
    TokenFactory public immutable tokenFactory;
    WETH9 public immutable weth;
    address public immutable owner;

    struct LaunchInfo {
        address token;
        address pair;
        uint256 initialLiquidity;
    }

    event TokenLaunched(address token, address pair, uint256 initialLiquidity);
    event Sniped(address sniper, address pair, uint256 amount);

    constructor(address _factory, address _tokenFactory, address _weth) {
        factory = IUniswapV2Factory(_factory);
        tokenFactory = TokenFactory(_tokenFactory);
        weth = WETH9(payable(_weth));
        owner = msg.sender;
    }

    function launchTokenWithLiquidity(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 ethForLiquidity
    ) external payable returns (LaunchInfo memory) {
        require(msg.value >= ethForLiquidity, "Insufficient ETH sent");
        
        // Create token
        address token = tokenFactory.createToken(
            name,
            symbol,
            18, // standard decimals
            initialSupply
        );

        // Create pair
        address pair = factory.createPair(address(weth), token);

        // Approve spending
        IERC20Basic(token).approve(pair, initialSupply);
        weth.approve(pair, ethForLiquidity);

        // Add liquidity
        weth.deposit{value: ethForLiquidity}();
        
        // Transfer tokens to pair
        IERC20Basic(token).transfer(pair, initialSupply);
        weth.transfer(pair, ethForLiquidity);
        
        // Mint LP tokens
        IUniswapV2Pair(pair).mint(msg.sender);

        emit TokenLaunched(token, pair, ethForLiquidity);

        return LaunchInfo({
            token: token,
            pair: pair,
            initialLiquidity: ethForLiquidity
        });
    }

    function snipe(
        address pair,
        uint256 ethAmount,
        uint256 minTokensOut
    ) external payable {
        require(msg.value >= ethAmount, "Insufficient ETH for sniping");
        
        // Get tokens from pair
        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        
        // Determine which token is WETH
        bool isToken0WETH = token0 == address(weth);
        require(isToken0WETH || token1 == address(weth), "Pair must contain WETH");
        
        // Get reserves
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        
        // Calculate amount out based on x * y = k
        uint256 amountOut;
        if (isToken0WETH) {
            amountOut = _getAmountOut(ethAmount, reserve0, reserve1);
            require(amountOut >= minTokensOut, "Insufficient tokens out");
            
            // Swap ETH -> Token
            weth.deposit{value: ethAmount}();
            weth.transfer(pair, ethAmount);
            IUniswapV2Pair(pair).swap(0, amountOut, msg.sender, "");
        } else {
            amountOut = _getAmountOut(ethAmount, reserve1, reserve0);
            require(amountOut >= minTokensOut, "Insufficient tokens out");
            
            // Swap ETH -> Token
            weth.deposit{value: ethAmount}();
            weth.transfer(pair, ethAmount);
            IUniswapV2Pair(pair).swap(amountOut, 0, msg.sender, "");
        }

        emit Sniped(msg.sender, pair, ethAmount);
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    receive() external payable {}
}