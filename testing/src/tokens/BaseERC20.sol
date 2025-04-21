// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BaseERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply,
        address initialHolder
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(initialHolder, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}