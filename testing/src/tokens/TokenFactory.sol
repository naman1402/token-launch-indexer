// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.29;

import "./MemeToken.sol";

contract TokenFactory {
    event TokenCreated(address token, string name, string symbol, uint8 decimals, uint256 totalSupply);
    
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply
    ) external returns (address) {
        MemeToken token = new MemeToken(name, symbol, decimals, totalSupply);
        token.transfer(msg.sender, totalSupply); // Transfer all tokens to creator
        
        emit TokenCreated(address(token), name, symbol, decimals, totalSupply);
        return address(token);
    }
}