// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ITokenFactory.sol";
import "./BaseERC20.sol";

contract TokenFactory is ITokenFactory {
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external returns (address) {
        BaseERC20 token = new BaseERC20(
            name,
            symbol,
            decimals,
            initialSupply,
            msg.sender
        );
        
        emit TokenCreated(address(token), name, symbol);
        return address(token);
    }
}