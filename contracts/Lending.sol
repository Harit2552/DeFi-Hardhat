// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token1.sol";
import "./Token2.sol";

contract Lending {
    Token1 public token1;
    Token2 public token2;
    address public owner;

    struct Deposit {
        uint256 amountToken1;
        uint256 amountToken2;
    }

    mapping(address => Deposit) public deposits;

    constructor(address _token1, address _token2) {
        token1 = Token1(_token1);
        token2 = Token2(_token2);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Deposit Token1
    function depositToken1(uint256 amount) public {
        require(token1.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender].amountToken1 += amount;
    }

    // Deposit Token2
    function depositToken2(uint256 amount) public {
        require(token2.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender].amountToken2 += amount;
    }

    // Borrow Token2 against Token1
    function borrowToken2(uint256 amount) public {
        uint256 maxBorrow = (deposits[msg.sender].amountToken1 * 2 * 70) / 100; // 70% of 2x Token1
        require(amount <= maxBorrow, "Exceeds borrow limit");
        require(token2.transfer(msg.sender, amount), "Borrow transfer failed");
    }

    // Borrow Token1 against Token2
    function borrowToken1(uint256 amount) public {
        uint256 maxBorrow = (deposits[msg.sender].amountToken2 * 70) / 100; // 70% of (1/2) ratio
        require(amount <= maxBorrow, "Exceeds borrow limit");
        require(token1.transfer(msg.sender, amount), "Borrow transfer failed");
    }

    // Owner withdraws funds
    function withdraw(address token, uint256 amount) public onlyOwner {
        if (token == address(token1)) {
            require(token1.transfer(owner, amount), "Withdraw failed");
        } else if (token == address(token2)) {
            require(token2.transfer(owner, amount), "Withdraw failed");
        }
    }
}
  