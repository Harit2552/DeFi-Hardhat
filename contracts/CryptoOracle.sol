// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract CryptoOracle {
    address public owner;

    mapping(string => uint256) public prices;

    constructor() {
        owner = msg.sender;
    }

    function updatePrice(string memory token, uint256 price) public {
        require(msg.sender == owner, "Not authorized");
        prices[token] = price;
    }

    function getPrice(string memory token) public view returns (uint256) {
        return prices[token];
    }
}
