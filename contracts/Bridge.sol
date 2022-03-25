// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IToken.sol";

contract Bridge is Ownable {
    uint256 public chainId;
    mapping(string => address) public allowedTokens;
    mapping(address => mapping(uint256 => bool)) public processedNonces;

    constructor(uint256 _chainId) {
        chainId = _chainId;
    }

    event Transfer(
        address from,
        address to,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        uint256 nonce,
        address token
    );

    function swap(
        address to,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        uint256 nonce,
        string memory symbol
    ) public {
        require(
            chainFrom == chainId,
            "Sender's chain must match the contract's chain"
        );
        require(allowedTokens[symbol] != address(0), "Token must be allowed");
        require(
            processedNonces[msg.sender][nonce] == false,
            "Already processed"
        );
        processedNonces[msg.sender][nonce] = true;
        IToken(allowedTokens[symbol]).burn(msg.sender, amount);
        emit Transfer(
            msg.sender,
            to,
            amount,
            chainFrom,
            chainTo,
            nonce,
            allowedTokens[symbol]
        );
    }

    function redeem(
        address to,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        uint256 nonce,
        string memory symbol,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(
            chainTo == chainId,
            "Recipient's chain must match the contract's chain"
        );
        require(allowedTokens[symbol] != address(0), "Token must be allowed");
        require(
            checkSign(msg.sender, amount, v, r, s) == msg.sender,
            "Signature doesn't match"
        );
        require(
            processedNonces[msg.sender][nonce] == false,
            "Already processed"
        );
        processedNonces[msg.sender][nonce] = true;
        IToken(allowedTokens[symbol]).mint(to, amount);
        emit Transfer(
            msg.sender,
            to,
            amount,
            chainFrom,
            chainTo,
            nonce,
            allowedTokens[symbol]
        );
    }

    function updateChainById(uint256 _chainId) public onlyOwner {
        chainId = _chainId;
    }

    function includeToken(string memory _symbol, address _tokenAddress)
        public
        onlyOwner
    {
        allowedTokens[_symbol] = _tokenAddress;
    }

    function excludeToken(string memory _symbol) public onlyOwner {
        delete allowedTokens[_symbol];
    }

    function checkSign(
        address addr,
        uint256 val,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private pure returns (address) {
        bytes32 message = keccak256(abi.encodePacked(addr, val));
        return ecrecover(hashMessage(message), v, r, s);
    }

    function hashMessage(bytes32 message) private pure returns (bytes32) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, message));
    }
}
