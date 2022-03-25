// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.1;

interface IToken {

    function mint(address to, uint256 amount) external;

    function burn(address owner, uint256 amount) external;
}
