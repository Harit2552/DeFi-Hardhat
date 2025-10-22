const { ethers } = require("hardhat");

describe("LendingPool Test", function () {
  let Token1, Token2, LendingPool;
  let token1, token2, pool;
  let owner, addr1, addr2;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    console.log("=== Deploying Contracts ===");
    Token1 = await ethers.getContractFactory("Token1");
    Token2 = await ethers.getContractFactory("Token2");
    token1 = await Token1.deploy(10000);
    token2 = await Token2.deploy(10000);

    LendingPool = await ethers.getContractFactory("Lending");
    pool = await LendingPool.deploy(token1.address, token2.address);

    console.log("Token1 deployed at:", token1.address);
    console.log("Token2 deployed at:", token2.address);
    console.log("LendingPool deployed at:", pool.address);

    console.log("\n=== Initial Balances (Owner) ===");
    console.log("Owner Token1:", (await token1.balanceOf(owner.address)).toString());
    console.log("Owner Token2:", (await token2.balanceOf(owner.address)).toString());

    // Transfer tokens
    console.log("\n=== Transferring Tokens ===");
    await token1.transfer(addr1.address, 1000);
    console.log("Owner → Addr1 : 1000 Token1");

    await token2.transfer(addr2.address, 1000);
    console.log("Owner → Addr2 : 1000 Token2");

    await token1.transfer(pool.address, 2000);
    console.log("Owner → Pool  : 2000 Token1");

    await token2.transfer(pool.address, 2000);
    console.log("Owner → Pool  : 2000 Token2");

    console.log("\n=== Balances After Setup ===");
    console.log("Owner Token1:", (await token1.balanceOf(owner.address)).toString());
    console.log("Owner Token2:", (await token2.balanceOf(owner.address)).toString());
    console.log("Pool Token1:", (await token1.balanceOf(pool.address)).toString());
    console.log("Pool Token2:", (await token2.balanceOf(pool.address)).toString());
    console.log("Addr1 Token1:", (await token1.balanceOf(addr1.address)).toString());
    console.log("Addr2 Token2:", (await token2.balanceOf(addr2.address)).toString());
  });

  it("Deposits and borrows correctly", async function () {
    console.log("\n=== Addr1 Deposits 100 Token1 and Borrows 140 Token2 ===");
    await token1.connect(addr1).approve(pool.address, 1000);
    await pool.connect(addr1).depositToken1(100);
    await token2.connect(addr1).approve(pool.address, 1000);
    await pool.connect(addr1).borrowToken2(140);

    console.log("Addr1 Token1:", (await token1.balanceOf(addr1.address)).toString());
    console.log("Addr1 Token2:", (await token2.balanceOf(addr1.address)).toString());

    console.log("\n=== Addr2 Deposits 100 Token2 and Borrows 35 Token1 ===");
    await token2.connect(addr2).approve(pool.address, 1000);
    await pool.connect(addr2).depositToken2(100);
    await token1.connect(addr2).approve(pool.address, 1000);
    await pool.connect(addr2).borrowToken1(35);

    console.log("Addr2 Token1:", (await token1.balanceOf(addr2.address)).toString());
    console.log("Addr2 Token2:", (await token2.balanceOf(addr2.address)).toString());

    console.log("\n=== Pool Balances After Borrows ===");
    console.log("Pool Token1:", (await token1.balanceOf(pool.address)).toString());
    console.log("Pool Token2:", (await token2.balanceOf(pool.address)).toString());
  });

  it("Owner can withdraw pool funds", async function () {
    console.log("\n=== Owner Withdraws 1000 Token1 and 1000 Token2 from Pool ===");
    console.log("Owner Before → Token1:", (await token1.balanceOf(owner.address)).toString());
    console.log("Owner Before → Token2:", (await token2.balanceOf(owner.address)).toString());

    await pool.withdraw(token1.address, 1000);
    await pool.withdraw(token2.address, 1000);

    console.log("Owner After  → Token1:", (await token1.balanceOf(owner.address)).toString());
    console.log("Owner After  → Token2:", (await token2.balanceOf(owner.address)).toString());

    console.log("\n=== Final Pool Balances ===");
    console.log("Pool Token1:", (await token1.balanceOf(pool.address)).toString());
    console.log("Pool Token2:", (await token2.balanceOf(pool.address)).toString());
  });
});
