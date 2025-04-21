// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/console.sol";

contract WETH9 {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    receive() external payable {
        console.log("WETH received ETH from:", msg.sender, "amount:", msg.value);
        deposit();
    }

    fallback() external payable {
        console.log("WETH fallback called from:", msg.sender, "amount:", msg.value);
        deposit();
    }

    function deposit() public payable {
        console.log("WETH deposit called by:", msg.sender, "amount:", msg.value);
        require(msg.value > 0, "Cannot deposit 0 ETH");
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
        console.log("WETH deposit successful, new balance:", balanceOf[msg.sender]);
    }

    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad, "Insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint wad) public returns (bool) {
        require(balanceOf[src] >= wad, "Insufficient balance");

        if (src != msg.sender) {
            require(allowance[src][msg.sender] >= wad, "Insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);
        return true;
    }
}