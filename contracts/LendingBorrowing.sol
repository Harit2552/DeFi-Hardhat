// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

interface ICryptoOracle {
    function getPrice(string calldata symbol) external view returns (uint256);
}

contract LendingBorrowing {
    address public owner;
    address public oracle;   // oracle contract address (string-based)

    string public collateralSymbol; // use string symbol
    uint256 public LTV = 50;

    mapping(string => address) public tokenBySymbol;
    mapping(address => mapping(string => uint256)) public deposits;
    mapping(address => mapping(string => uint256)) public borrows;
    mapping(string => uint256) public totalLiquidity;

    event Deposit(address indexed user, string symbol, uint256 amount);
    event Withdraw(address indexed user, string symbol, uint256 amount);
    event Borrow(address indexed user, string symbol, uint256 amount);
    event Repay(address indexed user, string symbol, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(string memory _collateralSymbol, address _oracle) {
        owner = msg.sender;
        collateralSymbol = _collateralSymbol;
        oracle = _oracle;
    }

    // ADMIN
    function setToken(string calldata symbol, address tokenAddress) external onlyOwner {
        tokenBySymbol[symbol] = tokenAddress;
    }

    function setLTV(uint256 newLTV) external onlyOwner {
        require(newLTV <= 90, "LTV too high");
        LTV = newLTV;
    }

    // helper: get price from oracle (oracle returns price scaled already if that's its design)
    function getPrice(string memory symbol) public view returns (uint256) {
        return ICryptoOracle(oracle).getPrice(symbol); // same name as your deployed oracle
    }

    // USER ACTIONS
    function deposit(string calldata symbol, uint256 amount) external {
        require(amount > 0, "amount zero");
        address token = tokenBySymbol[symbol];
        require(token != address(0), "token not set");

        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        deposits[msg.sender][symbol] += amount;
        totalLiquidity[symbol] += amount;

        emit Deposit(msg.sender, symbol, amount);
    }

    function withdraw(string calldata symbol, uint256 amount) external {
        require(amount > 0, "amount zero");
        require(deposits[msg.sender][symbol] >= amount, "insufficient deposit");

        deposits[msg.sender][symbol] -= amount;
        totalLiquidity[symbol] -= amount;

        bool ok = IERC20(tokenBySymbol[symbol]).transfer(msg.sender, amount);
        require(ok, "transfer failed");

        emit Withdraw(msg.sender, symbol, amount);
    }

    function borrow(string calldata symbol, uint256 amount) external {
        require(amount > 0, "amount zero");
        address token = tokenBySymbol[symbol];
        require(token != address(0), "token not supported");

        uint256 pCollateral = getPrice(collateralSymbol);
        uint256 pBorrow = getPrice(symbol);
        require(pCollateral > 0 && pBorrow > 0, "oracle price missing");

        uint256 collateralAmount = deposits[msg.sender][collateralSymbol];
        require(collateralAmount > 0, "no collateral");

        // collateralAmount * pCollateral  (both are uint256; take care with scales)
        uint256 collateralUSD = collateralAmount * pCollateral;
        uint256 borrowUSD = amount * pBorrow;
        uint256 allowedUSD = collateralUSD * LTV / 100;

        uint256 existingBorrowUSD = borrows[msg.sender][symbol] * pBorrow;

        require(existingBorrowUSD + borrowUSD <= allowedUSD, "exceeds LTV");
        require(totalLiquidity[symbol] >= amount, "no liquidity");

        borrows[msg.sender][symbol] += amount;
        totalLiquidity[symbol] -= amount;

        bool ok = IERC20(token).transfer(msg.sender, amount);
        require(ok, "transfer failed");

        emit Borrow(msg.sender, symbol, amount);
    }

    function repay(string calldata symbol, uint256 amount) external {
        require(amount > 0, "amount zero");
        address token = tokenBySymbol[symbol];
        require(token != address(0), "token not supported");
        require(borrows[msg.sender][symbol] >= amount, "repay > borrow");

        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        borrows[msg.sender][symbol] -= amount;
        totalLiquidity[symbol] += amount;

        emit Repay(msg.sender, symbol, amount);
    }

    // VIEW HELPERS
    function getDeposit(address user, string calldata symbol) external view returns (uint256) {
        return deposits[user][symbol];
    }

    function getBorrow(address user, string calldata symbol) external view returns (uint256) {
        return borrows[user][symbol];
    }
}  