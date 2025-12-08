# DeFi Protocol - Deployment Checklist ✅

## Pre-Deployment

- [ ] Node.js and npm installed
- [ ] Hardhat and dependencies installed: `npm install`
- [ ] MetaMask browser extension installed
- [ ] VS Code opened in project folder

## Step 1: Start Local Blockchain

```powershell
npx hardhat node
```

**Expected output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545
```

Keep this terminal running!

## Step 2: Deploy Contracts

Open new PowerShell terminal and run:

```powershell
cd "c:\Users\DELL\Desktop\Harit\Blockchain\Third Year\Semester 5\HardHat"
$env:NETWORK="localhost"
npx hardhat run scripts/deployAll.js --network localhost
```

**Expected output:**
```
=== Deploying Tokens ===
BTC: 0x9fE46736679d2D9a65F0991F7d7C50328b441313
ETH: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
BNB: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
USDT: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
SUI: 0x0165878A594ca255338adfa4d0e4843b7b1f5175

=== Deploying Oracle ===
Oracle: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

=== Deploying LendingBorrowing ===
LendingBorrowing: 0x5FbDB2315678afccda1f0B6Aa00f8d3bEe72c0c2

=== Setting Token Addresses ===
setToken BTC => 0x9fE46736679d2D9a65F0991F7d7C50328b441313
...

=== Funding Pool ===
Funded pool with 50,000 ETH
Funded pool with 500 BTC
Funded pool with 2,000,000 BNB
Funded pool with 2,000,000 USDT
Funded pool with 2,000,000 SUI

=== Setting Initial Prices ===
Oracle prices initialized

=== Deployment Complete ===
```

✅ **Copy all addresses from output**

## Step 3: Update Frontend Config

Edit `frontend/src/config.js` with addresses from Step 2:

```javascript
export const config = {
  lendingBorrowAddress: "0x5FbDB2315678afccda1f0B6Aa00f8d3bEe72c0c2",
  oracleAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  tokens: {
    BTC: "0x9fE46736679d2D9a65F0991F7d7C50328b441313",
    ETH: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    BNB: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    USDT: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    SUI: "0x0165878A594ca255338adfa4d0e4843b7b1f5175"
  },
  collateralSymbol: "ETH"
};
```

## Step 4: Start Oracle Price Updates

Open new PowerShell terminal:

```powershell
cd "c:\Users\DELL\Desktop\Harit\Blockchain\Third Year\Semester 5\HardHat"
$env:NETWORK="localhost"
$env:ORACLE_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
$env:PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded87391dda1db2a067b74"
npx hardhat run scripts/updatePrices.js --network localhost
```

**Expected output:**
```
🔄 Fetching latest crypto prices (USD)...
📤 Updating BTC price: 67000 USD
📤 Updating ETH price: 2600 USD
...
⏱ Waiting 30 seconds before next update...
```

Keep this terminal running!

## Step 5: Start Frontend

Open new PowerShell terminal:

```powershell
cd "c:\Users\DELL\Desktop\Harit\Blockchain\Third Year\Semester 5\HardHat\frontend"
npm install
npm start
```

**Expected:** Browser opens to http://localhost:3000

## Step 6: Setup MetaMask

1. Click MetaMask extension
2. Click network dropdown (top left)
3. Click "Add Network"
4. Fill in:
   - Network name: `Hardhat`
   - New RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
5. Click "Save"
6. Select "Hardhat" network

## Step 7: Import Test Account

1. In Hardhat terminal, find first account address (index 0)
2. Get private key from Hardhat startup logs or use:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded87391dda1db2a067b74
   ```
3. In MetaMask:
   - Click account icon (top right)
   - Select "Import Account"
   - Paste private key
   - Click "Import"

✅ Account now has all tokens!

## Step 8: Test the DeFi App

### Test Supply

1. Click "Markets" tab
2. Find "ETH" card
3. Click "Supply" button
4. Enter amount: `10`
5. Approve + Confirm
6. Check Portfolio → Supplied Assets shows 10 ETH

### Test Borrow

1. On Markets, find "USDT" card
2. Click "Borrow" button
3. Enter amount: `300` (You have ~5000 USD collateral, can borrow 50% = ~2500 USD)
4. Confirm
5. Check Portfolio → Borrowed Assets shows 300 USDT

### Check Health Factor

- Portfolio page shows:
  - Health Factor: ~650% (collateral value × LTV / borrow value)
  - Total Collateral: ~26,000 USD
  - Total Borrowed: ~300 USD
  - Status: ✅ Safe (green)

### Test Withdraw

1. Go to Portfolio
2. Click appropriate action button for supplied token
3. Enter amount to withdraw
4. Confirm

## 🔄 Restart Guide

If you need to restart everything:

1. Stop all terminals (Ctrl+C)
2. Delete cache:
   ```powershell
   rm -r artifacts cache
   ```
3. Restart from Step 1

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "No provider" error | Hardhat node not running |
| "Contract not deployed" | Deploy not completed or wrong addresses in config.js |
| "MetaMask not connected" | Switch to Hardhat network, check RPC URL |
| "Prices not updating" | Oracle update script not running, check ORACLE_ADDRESS |
| "Supply fails" | Insufficient token balance, approve amount too low |
| "Borrow fails" | Insufficient collateral (need ETH deposited first) |

## 📊 Protocol Stats After Setup

- **Total Liquidity (Pool):**
  - BTC: 500
  - ETH: 50,000
  - BNB: 2,000,000
  - USDT: 2,000,000
  - SUI: 2,000,000

- **Your Account:**
  - BTC: 1000 (100% in pool)
  - ETH: 49,950 (50 in pool + 50,000 - 50 = 49,950)
  - BNB: 5,000,000 - 2,000,000 = 3,000,000
  - USDT: 5,000,000 - 2,000,000 = 3,000,000
  - SUI: 5,000,000 - 2,000,000 = 3,000,000

- **Protocol Rules:**
  - Collateral: ETH only
  - LTV: 50% (can borrow up to 50% of ETH value)
  - Liquidation trigger: Health Factor < 100%
  - Liquidation bonus: 5%

## 🎉 Success!

Your Aave-like DeFi protocol is now fully functional. You can:
- ✅ Supply tokens
- ✅ Borrow against collateral
- ✅ Track health factor
- ✅ Repay loans
- ✅ Withdraw liquidity
- ✅ Liquidate unhealthy positions

Enjoy! 🚀
