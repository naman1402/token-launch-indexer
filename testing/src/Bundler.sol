// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract Bundler {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Bundler: caller is not the owner");
        _;
    }
    
    // Execute multiple calls atomically
    function bundle(
        address[] calldata targets,
        bytes[] calldata data,
        uint256[] calldata values
    ) external payable onlyOwner returns (bytes[] memory results) {
        require(targets.length == data.length, "Bundler: targets and data length mismatch");
        require(targets.length == values.length, "Bundler: targets and values length mismatch");
        
        // Check if enough ETH was sent
        uint256 totalValue = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }
        require(msg.value >= totalValue, "Bundler: insufficient ETH sent");
        
        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(data[i]);
            require(success, "Bundler: call failed");
            results[i] = result;
        }
        
        // Return remaining ETH
        if (msg.value > totalValue) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalValue}("");
            require(success, "Bundler: ETH refund failed");
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Bundler: new owner is the zero address");
        owner = newOwner;
    }
    
    receive() external payable {}
}
