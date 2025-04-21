// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.20;

import './IERC20Basic.sol';

interface IUniswapV2ERC20 is IERC20Basic {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}