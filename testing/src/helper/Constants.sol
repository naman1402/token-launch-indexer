// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DeploymentConstants {
    // Tokens
    address public constant ZERO_ADDRESS = address(0);
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether; // 1 billion tokens
    uint8 public constant USDC_DECIMALS = 6;
    uint8 public constant USDT_DECIMALS = 6;
    uint8 public constant TOKEN_DECIMALS = 18;
    
    // Pair Settings
    uint256 public constant INITIAL_LP_TOKENS = 10_000 ether; // Initial LP amount for testing
    uint256 public constant INITIAL_LP_ETH = 100 ether;      // Initial ETH liquidity

    // Addresses (updated during deployment)
    address payable public weth;             // WETH token
    address public usdc;             // USDC token
    address public usdt;             // USDT token
    address public factory;          // UniswapV2Factory
    address public router;           // UniswapV2Router02
    address public tokenFactory;     // Test token factory

    constructor() {
        // Initialize with zero addresses
        weth = payable(ZERO_ADDRESS);
        usdc = ZERO_ADDRESS;
        usdt = ZERO_ADDRESS;
        factory = ZERO_ADDRESS;
        router = ZERO_ADDRESS;
        tokenFactory = ZERO_ADDRESS;
    }

    function setWETH(address _weth) external {
        require(weth == ZERO_ADDRESS, "WETH already set");
        weth = payable(_weth);
    }

    function setUSDC(address _usdc) external {
        require(usdc == ZERO_ADDRESS, "USDC already set");
        usdc = _usdc;
    }

    function setUSDT(address _usdt) external {
        require(usdt == ZERO_ADDRESS, "USDT already set");
        usdt = _usdt;
    }

    function setFactory(address _factory) external {
        require(factory == ZERO_ADDRESS, "Factory already set");
        factory = _factory;
    }

    function setRouter(address _router) external {
        require(router == ZERO_ADDRESS, "Router already set");
        router = _router;
    }

    function setTokenFactory(address _tokenFactory) external {
        require(tokenFactory == ZERO_ADDRESS, "TokenFactory already set");
        tokenFactory = _tokenFactory;
    }
}