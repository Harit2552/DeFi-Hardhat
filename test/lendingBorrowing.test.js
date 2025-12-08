const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lending & Borrowing System (Verbose Output)", function () {
    let owner, user;
    let btc, eth, bnb, usdt, sui;
    let lending, borrowing, oracle;

    before(async function () {
        console.log("\n=== 📌 Setting up test environment ===\n");

        [owner, user] = await ethers.getSigners();
        console.log("Owner:", owner.address);
        console.log("User :", user.address);

        // ---------- Deploy Tokens ----------
        const BTC = await ethers.getContractFactory("BTCMock");
        const ETH = await ethers.getContractFactory("ETHMock");
        const BNB = await ethers.getContractFactory("BNBMock");
        const USDT = await ethers.getContractFactory("TetherMock");
        const SUI = await ethers.getContractFactory("SUIMock");

        console.log("\nDeploying tokens...");
        btc = await BTC.deploy((1000)); await btc.deployed();
        eth = await ETH.deploy((100000)); await eth.deployed();
        bnb = await BNB.deploy((5000000)); await bnb.deployed();
        usdt = await USDT.deploy((5000000)); await usdt.deployed();
        sui = await SUI.deploy((5000000)); await sui.deployed();

        console.log("BTC =", btc.address);
        console.log("ETH =", eth.address);
        console.log("BNB =", bnb.address);
        console.log("USDT =", usdt.address);
        console.log("SUI =", sui.address);

        // Give user tokens
        console.log("\nTransferring 500 ETH to user...");
        await eth.transfer(user.address, (500));
        console.log("User ETH Balance:", (await eth.balanceOf(user.address)).toString());

        // ---------- LendingPool ----------
        console.log("\nDeploying LendingPool...");
        const LendingPool = await ethers.getContractFactory("LendingPool");

        lending = await LendingPool.deploy(
            btc.address,
            eth.address,
            bnb.address,
            usdt.address,
            sui.address
        );
        await lending.deployed();

        console.log("LendingPool =", lending.address);

        // ---------- Oracle ----------
        console.log("\nDeploying Oracle...");
        const Oracle = await ethers.getContractFactory("CryptoOracle");
        oracle = await Oracle.deploy();
        await oracle.deployed();

        console.log("Oracle =", oracle.address);

        // ---------- BorrowingPool ----------
        console.log("\nDeploying BorrowingPool...");
        const BorrowingPool = await ethers.getContractFactory("BorrowingPool");
        borrowing = await BorrowingPool.deploy(lending.address, oracle.address);
        await borrowing.deployed();

        console.log("BorrowingPool =", borrowing.address);

        console.log("\nLinking BorrowingPool to LendingPool...");
        await lending.setBorrowingPool(borrowing.address);

        // ---------- Seed Liquidity ----------
        console.log("\nSending 50,000 ETH to LendingPool as liquidity...");
        await eth.transfer(lending.address, (50000));

        console.log("LendingPool ETH Balance:", (await eth.balanceOf(lending.address)).toString());

        console.log("\nApproving BorrowingPool to move liquidity...");
        await eth.connect(owner).approve(borrowing.address, (99999999));

        console.log("\n=== Setup Complete ===\n");
    });

    it("User can deposit ETH", async function () {
        console.log("\n--- Test 1: Deposit ETH ---");

        console.log("Approving LendingPool...");
        await eth.connect(user).approve(lending.address, (100));

        console.log("Depositing 100 ETH...");
        await lending.connect(user).deposit("ETH", (100));

        const bal = await lending.deposits(user.address, "ETH");
        console.log("User deposited ETH:", bal.toString());

        expect(bal).to.equal((100));
    });

    it("Correctly calculates USD collateral", async function () {
        console.log("\n--- Test 2: Collateral USD Calculation ---");

        console.log("Setting Oracle price: ETH = $2000...");
        await oracle.updatePrice("ETH", (2000));

        const usd = await borrowing.getUserCollateralUSD(user.address);

        console.log("Collateral in USD (scaled):", usd.toString());

        const expected = (100).mul((2000)).div((1));
        console.log("Expected collateral:", expected.toString());

        expect(usd).to.equal(expected);
    });

    it("Allows borrowing within collateral limit", async function () {
        console.log("\n--- Test 3: Valid Borrow ---");

        console.log("Attempting to borrow 20 ETH...");
        await expect(
            borrowing.connect(user).borrow("ETH", (20))
        ).to.not.be.reverted;

        console.log("Borrow successful!");
    });

    it("Reverts when borrowing exceeds limit", async function () {
        console.log("\n--- Test 4: Over Borrow ---");

        console.log("Attempting to borrow 500 ETH (should fail)...");
        await expect(
            borrowing.connect(user).borrow("ETH", (500))
        ).to.be.revertedWith("Exceeds borrow limit");

        console.log("Correctly reverted!");
    });

});
