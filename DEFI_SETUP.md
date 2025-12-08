# Aave-Like DeFi Protocol

A fully functional lending and borrowing protocol with 5 tokens (BTC, ETH, BNB, USDT, SUI) and an oracle system for price updates.

## 🏗️ Architecture

### Smart Contracts

- **LendingBorrowing.sol** - Main protocol contract supporting:
  - Deposit (supply liquidity)
  - Withdraw
  - Borrow (with collateral check)
  - Repay
  - Liquidation (when health factor < 100%)
  - Health factor calculation

- **CryptoOracle.sol** - Price oracle for managing token prices (scaled by 100)

- **Mock ERC20 Tokens** - BTCMock, ETHMock, BNBMock, TetherMock (USDT), SUIMock

### Frontend

- **React + Ethers.js v6** with TailwindCSS
- **useProtocol Hook** - Centralized protocol interaction
- Components:
  - Markets - Display all available tokens
  - Portfolio - View deposits, borrows, health factor
  - AssetCard - Individual token interaction
  - Supply/Borrow Modals
  - Liquidation interface

## 🚀 Quick Start

### 1. Setup Backend

```bash
cd "c:\Users\DELL\Desktop\Harit\Blockchain\Third Year\Semester 5\HardHat"
npm install
```

### 2. Start Local Hardhat Node

```powershell
npx hardhat node
```

This starts a local blockchain on `http://127.0.0.1:8545`

### 3. Deploy Contracts

In a new terminal:

```powershell
$env:NETWORK="localhost"
npx hardhat run scripts/deployAll.js --network localhost
```

**Output will show:**
```
Oracle: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
LendingBorrowing: 0x5FbDB2315678afccda1f0B6Aa00f8d3bEe72c0c2
BTC: 0x9fE46736679d2D9a65F0991F7d7C50328b441313
ETH: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
BNB: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
USDT: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
SUI: 0x0165878A594ca255338adfa4d0e4843b7b1f5175
```

**Update `frontend/src/config.js` with these addresses**

### 4. Start Oracle Price Updates

In another terminal:

```powershell
$env:NETWORK="localhost"
$env:ORACLE_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
$env:PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded87391dda1db2a067b74"
npx hardhat run scripts/updatePrices.js --network localhost
```

The script fetches real prices from CoinGecko and updates the oracle every 30 seconds.

### 5. Run Frontend

In another terminal:

```bash
cd frontend
npm install
npm start
```

Opens on `http://localhost:3000`

## 📊 Key Features

### Lending & Borrowing

1. **Deposit** - Supply tokens to earn interest (store liquidity)
2. **Borrow** - Borrow up to LTV% of collateral value
   - ETH is the collateral token
   - LTV = 50% (can borrow up to 50% of collateral USD value)
3. **Repay** - Return borrowed tokens
4. **Withdraw** - Remove supplied liquidity

### Health Factor

$$HF\% = \frac{CollateralUSD \times LTV}{TotalBorrowUSD}$$

- **HF > 100%** → Safe ✅
- **100% > HF > 50%** → Warning ⚠️
- **HF < 50%** → Liquidation risk 🔴

### Liquidation

When health factor < 100%:
- Liquidator repays borrower's debt
- Receives 5% bonus collateral
- Example: Repay $1000 → Receive $105 worth of collateral

### Price Oracle

- Prices stored as **integers scaled by 100** (e.g., $67,000 BTC = 6,700,000)
- Updated every 30 seconds from CoinGecko
- Symbols: BTC, ETH, BNB, USDT, SUI

## 🔧 Protocol Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Collateral | ETH | Only token accepted as collateral |
| LTV | 50% | Max borrow 50% of collateral value |
| Liquidation Bonus | 5% | Liquidators receive 5% extra |
| Price Scale | 100x | All oracle prices × 100 |

## 📝 Usage Examples

### Supply Tokens

```javascript
const amount = "100"; // 100 ETH
await protocol.approve("ETH", amount);
await protocol.deposit("ETH", amount);
```

### Borrow Tokens

```javascript
// First deposit ETH as collateral (required)
const borrowAmount = "50"; // 50 USDT
await protocol.borrow("USDT", borrowAmount);
```

### Repay Debt

```javascript
const repayAmount = "50"; // 50 USDT
await protocol.approve("USDT", repayAmount);
await protocol.repay("USDT", repayAmount);
```

### Check Health Factor

```javascript
const healthFactor = await protocol.getHealthFactor(userAddress);
// Returns HF as percentage (e.g., 150 = 150%)
```

## 🧪 Testing

Run tests with:

```powershell
npx hardhat test
```

## 📱 Frontend Workflow

1. **Connect Wallet** - Click "Connect" button
2. **View Markets** - See all available tokens and liquidity
3. **Supply Assets** - Deposit tokens to earn interest
4. **Borrow Assets** - Borrow against ETH collateral
5. **Monitor Portfolio** - Track health factor and positions
6. **Liquidate** - (If health factor drops) Liquidate unhealthy positions

## 🔐 Security Notes

- All transfers use ERC20 standard
- Health factor checked before borrow
- Liquidation only when HF < 100%
- Owner-only functions for oracle updates

## 📚 File Structure

```
contracts/
├── LendingBorrowing.sol
├── CryptoOracle.sol
└── tokens/
    ├── BTC_Contract.sol
    ├── ETH_Contract.sol
    ├── BNB_Contract.sol
    ├── USDT_Contract.sol
    └── SUI_Contract.sol

frontend/src/
├── hooks/
│   └── useProtocol.js
├── components/
│   ├── Markets.jsx
│   ├── AssetCard.jsx
│   ├── Portfolio.jsx
│   ├── Modals/
│   │   ├── SupplyModal.jsx
│   │   └── BorrowModal.jsx
│   └── Navbar.jsx
├── pages/
│   ├── Home.jsx
│   └── PortfolioPage.jsx
└── config.js

scripts/
├── deployAll.js
└── updatePrices.js
```

## 🐛 Troubleshooting

### "Token not set" error
- Ensure deployment script completed successfully
- Verify all tokens in config.js

### "No liquidity" error
- Pool needs initial funding (done in deployment)
- Try smaller borrow amount

### Oracle prices not updating
- Check updatePrices.js is running
- Verify ORACLE_ADDRESS environment variable

### MetaMask not connecting
- Ensure Hardhat node is running on port 8545
- Add custom network to MetaMask:
  - Network: Hardhat
  - RPC URL: http://127.0.0.1:8545
  - Chain ID: 31337

## 📖 Further Development

To extend the protocol:

1. **Add APY calculation** - Track interest rates per token
2. **Flash loans** - Allow uncollateralized loans with callback
3. **Variable interest rates** - Dynamic APY based on utilization
4. **Risk management** - Adjust LTV by token
5. **Governance token** - Add GOVERNANCE token for DAO

---

**Built with ❤️ using Solidity, React, and Ethers.js**
