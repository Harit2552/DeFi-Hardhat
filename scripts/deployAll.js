// scripts/deployFull.js
require("dotenv").config();
const fs = require("fs");
const hre = require("hardhat");
const { ethers } = hre;

const toWei = (v) => ethers.utils.parseUnits(v.toString(), 18);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Deploy mock tokens (use your existing token contracts names)
  const BTC = await ethers.getContractFactory("BTCMock");
  const ETH = await ethers.getContractFactory("ETHMock");
  const BNB = await ethers.getContractFactory("BNBMock");
  const USDT = await ethers.getContractFactory("TetherMock");
  const SUI = await ethers.getContractFactory("SUIMock");

  const btc = await BTC.deploy(toWei(1000));
  const eth = await ETH.deploy(toWei(100000)); // used as collateral & liquidity token
  const bnb = await BNB.deploy(toWei(5000000));
  const usdt = await USDT.deploy(toWei(5000000));
  const sui = await SUI.deploy(toWei(5000000));

  await btc.deployed();
  await eth.deployed();
  await bnb.deployed();
  await usdt.deployed();
  await sui.deployed();

  console.log("Tokens:");
  console.log("BTC:", btc.address);
  console.log("ETH:", eth.address);
  console.log("BNB:", bnb.address);
  console.log("USDT:", usdt.address);
  console.log("SUI:", sui.address);

  // 2. Deploy Oracle
  const Oracle = await ethers.getContractFactory("CryptoOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("Oracle:", oracle.address);

  // 3. Deploy LendingBorrowing (pass collateral symbol as bytes32)
  const LendingBorrowing = await ethers.getContractFactory("LendingBorrowing");
  const lendingBorrow = await LendingBorrowing.deploy("ETH", oracle.address);
  await lendingBorrow.deployed();
  console.log("LendingBorrowing:", lendingBorrow.address);

  // 4. Set token addresses in the contract
  const setToken = async (sym) => {
    let addr;
    switch(sym) {
      case "BTC": addr = btc.address; break;
      case "ETH": addr = eth.address; break;
      case "BNB": addr = bnb.address; break;
      case "USDT": addr = usdt.address; break;
      case "SUI": addr = sui.address; break;
    }
    await lendingBorrow.setToken(sym, addr);
    console.log(`setToken ${sym} => ${addr}`);
  };

  await setToken("BTC");
  await setToken("ETH");
  await setToken("BNB");
  await setToken("USDT");
  await setToken("SUI");

  // 5. Fund pool liquidity: transfer some ETHMock to contract and update totalLiquidity via deposit trick
  // Approach: owner approves contract and calls deposit (we must call deposit from the deployer after approve)
  const ethContract = eth.connect(deployer);
  await ethContract.approve(lendingBorrow.address, toWei(10000));
  // deposit needs bytes32 symbol and amount
  // 5. Fund pool liquidity for ALL tokens
  async function fundPool(symbol, tokenContract, amount) {
    const dec = 18;
    const weiAmount = ethers.utils.parseUnits(amount.toString(), dec);

    await tokenContract.approve(lendingBorrow.address, weiAmount);
    await lendingBorrow.deposit(symbol, weiAmount);

    console.log(`Funded pool with ${amount} ${symbol}`);
  }

  await fundPool("BTC", btc.connect(deployer), 200);
  await fundPool("ETH", eth.connect(deployer), 10000);
  await fundPool("BNB", bnb.connect(deployer), 20000);
  await fundPool("USDT", usdt.connect(deployer), 1000000);
  await fundPool("SUI", sui.connect(deployer), 500000);


  // 6. Persist addresses to .env for frontend
  const envContent = `PRIVATE_KEY=${process.env.PRIVATE_KEY || ""}
LOCAL_RPC=${process.env.LOCAL_RPC || "http://127.0.0.1:8545"}
NETWORK=${process.env.NETWORK || "localhost"}

ORACLE_ADDRESS=${oracle.address}
LENDINGBORROW_ADDRESS=${lendingBorrow.address}

BTC_TOKEN=${btc.address}
ETH_TOKEN=${eth.address}
BNB_TOKEN=${bnb.address}
USDT_TOKEN=${usdt.address}
SUI_TOKEN=${sui.address}
`;
  fs.writeFileSync(".env", envContent);
  console.log(".env written with deployed addresses");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
