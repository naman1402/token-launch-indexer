// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITokenFactory {
    event TokenCreated(address token, string name, string symbol);
    
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external returns (address);
}