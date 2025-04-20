// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IERC20.sol";

contract Relayer {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Relayer: caller is not the owner");
        _;
    }
    
    function executeTransaction(
        address target, 
        uint256 value, 
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        // Execute the transaction
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Relayer: transaction execution failed");
        return result;
    }
    
    function batchExecute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external onlyOwner returns (bytes[] memory results) {
        require(targets.length == data.length, "Relayer: targets and data length mismatch");
        require(targets.length == values.length, "Relayer: targets and values length mismatch");
        
        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(data[i]);
            require(success, "Relayer: batch execution failed");
            results[i] = result;
        }
    }
    
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Relayer: new owner is the zero address");
        owner = newOwner;
    }
    
    receive() external payable {}
}
