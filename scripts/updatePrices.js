require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const axios = require("axios");

// 🧾 ENV variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const LOCAL_RPC = process.env.LOCAL_RPC;
const CONTRACT_ADDRESS = process.env.ORACLE_ADDRESS;
const NETWORK = process.env.NETWORK || "localhost";

// 🪙 CoinGecko IDs → Your Oracle Keys
const tokenMap = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  sui: "SUI",
  tether: "USDT",
};

const tokens = Object.keys(tokenMap); // [bitcoin, ethereum, binancecoin, sui, tether]

// ✅ Provider and wallet setup
let provider;
if (NETWORK === "localhost") {
  provider = new ethers.providers.JsonRpcProvider(LOCAL_RPC);
} else {
  throw new Error("Unsupported network. Use NETWORK=localhost");
}

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function updatePrices() {
  try {
    console.log("\n🔄 Fetching latest crypto prices (USD)...");

    const res = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: tokens.join(","), vs_currencies: "usd" },
    });

    console.table(res.data);

    const Oracle = await hre.ethers.getContractAt("CryptoOracle", CONTRACT_ADDRESS, wallet);

    const owner = await Oracle.owner();
    console.log("👑 Contract Owner:", owner);
    console.log("🧾 Connected Wallet:", wallet.address);

    if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
      console.error("⚠ You are not the contract owner. Cannot update prices.");
      return;
    }

    // ====== 🔥 Correct: Update using SYMBOLS (BTC, ETH…) ======
    for (const cgName of tokens) {
      const symbol = tokenMap[cgName]; // BTC, ETH, etc.
      const usdPrice = Math.round(res.data[cgName].usd * 100); // scaled ×100

      console.log(`📤 Updating ${symbol} price: ${usdPrice / 100} USD`);

      const tx = await Oracle.updatePrice(symbol, usdPrice);
      await tx.wait();

      const stored = await Oracle.getPrice(symbol);
      console.log(`💾 On-chain ${symbol} price: ${stored / 100} USD\n`);
    }

    console.log("🎯 All token prices updated successfully!");
    console.log("⏱ Waiting 30 seconds before next update...\n");

  } catch (err) {
    console.error("❌ Error updating prices:", err);
  } finally {
    setTimeout(updatePrices, 30 * 1000);
  }
}

// 🚀 Run immediately
updatePrices();
