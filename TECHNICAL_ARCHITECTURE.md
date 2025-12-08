# DeFi Protocol - Technical Architecture

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (3000)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Pages: Markets | Portfolio                           │  │
│  │  Components: AssetCard | SupplyModal | BorrowModal   │  │
│  │  Hook: useProtocol (centralized state)               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ ethers.js (Web3)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Hardhat Local Node (8545)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ LendingBorro-│  │ CryptoOracle │  │  Mock ERC20      │   │
│  │ wing.sol     │  │.sol          │  │  Tokens (5)      │   │
│  │              │  │              │  │                  │   │
│  │ - deposit()  │  │ - getPrice() │  │ - BTC, ETH       │   │
│  │ - borrow()   │  │ - updatePri()│  │ - BNB, USDT, SUI │   │
│  │ - repay()    │  │              │  │                  │   │
│  │ - withdraw() │  │              │  │ 18 decimals each │   │
│  │ - liquidate()│  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  Price Update Service (CoinGecko API)                        │
│  Updates every 30 seconds                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Deposit Flow
```
User
  │
  ├─ 1. Connect Wallet → setAccount, setProvider, setSigner
  │
  ├─ 2. Call deposit(symbol, amount)
  │      │
  │      ├─ 3. Fetch decimals → parseUnits(amount, dec)
  │      │
  │      ├─ 4. Call approve(token, amount)
  │      │      └─ ERC20.approve(lendingContract, amount)
  │      │
  │      ├─ 5. Call LendingBorrowing.deposit(symbol, amount)
  │      │      │
  │      │      ├─ Validate: amount > 0, token exists
  │      │      ├─ Transfer: IERC20(token).transferFrom(user, contract, amount)
  │      │      ├─ Update: deposits[user][symbol] += amount
  │      │      ├─ Update: totalLiquidity[symbol] += amount
  │      │      └─ Emit: Deposit(user, symbol, amount)
  │      │
  │      └─ 6. Fetch updated balances
  │
  └─ 7. UI shows new balance in Portfolio
```

### Borrow Flow
```
User
  │
  ├─ 1. Call borrow(symbol, amount)
  │      │
  │      ├─ 2. LendingBorrowing.borrow(symbol, amount)
  │      │      │
  │      │      ├─ Check: collateralAmount > 0 (must have ETH)
  │      │      │
  │      │      ├─ Get Prices:
  │      │      │   - pCollateral = oracle.getPrice("ETH")
  │      │      │   - pBorrow = oracle.getPrice(symbol)
  │      │      │
  │      │      ├─ Calculate Limits:
  │      │      │   - collateralUSD = collateral * pCollateral
  │      │      │   - borrowUSD = amount * pBorrow
  │      │      │   - allowedUSD = collateralUSD * LTV / 100
  │      │      │
  │      │      ├─ Validate: existingBorrow + newBorrow <= allowedUSD
  │      │      │
  │      │      ├─ Update: borrows[user][symbol] += amount
  │      │      ├─ Update: totalLiquidity[symbol] -= amount
  │      │      ├─ Transfer: IERC20(token).transfer(user, amount)
  │      │      └─ Emit: Borrow(user, symbol, amount)
  │      │
  │      └─ 3. Fetch updated balances
  │
  └─ 4. UI shows new borrow in Portfolio
```

### Health Factor Calculation
```
Input:
  - User address
  - Borrowed token symbols

Process:
  1. Calculate Total Borrow Value (in oracle-scaled units):
     totalBorrowUSD = Σ(borrows[user][symbol] * getPrice(symbol))
  
  2. Get Collateral Value:
     collateralAmount = deposits[user]["ETH"]
     collateralPrice = oracle.getPrice("ETH")
     collateralValue = collateralAmount * collateralPrice
  
  3. Calculate Health Factor:
     healthFactor = (collateralValue * LTV) / totalBorrowUSD
     
     Formula: HF = (collateral × LTV%) / total_borrow
     
     Example:
       - Collateral: 10 ETH @ $2600 = $26,000
       - LTV: 50%
       - Borrow: $10,000
       - HF = (26,000 × 50) / 10,000 = 130% ✅ Safe
  
  4. Status:
     HF > 100% → Safe ✅
     100% > HF > 50% → Warning ⚠️
     HF < 50% → Danger 🔴 (liquidatable)

Output: Health Factor as percentage integer
```

---

## 💾 State Management

### Smart Contract State
```solidity
// User deposits by token
mapping(address => mapping(string => uint256)) public deposits;
  Example: deposits[0xuser]["ETH"] = 100e18

// User borrows by token
mapping(address => mapping(string => uint256)) public borrows;
  Example: borrows[0xuser]["USDT"] = 50000e6

// Total liquidity available per token
mapping(string => uint256) public totalLiquidity;
  Example: totalLiquidity["ETH"] = 50000e18

// Token addresses by symbol
mapping(string => address) public tokenBySymbol;
  Example: tokenBySymbol["BTC"] = 0x...

// Oracle prices (scaled by 100)
// Managed in CryptoOracle.sol
mapping(string => uint256) public prices;
  Example: prices["BTC"] = 6700000 (means $67,000)
```

### Frontend State (React)
```javascript
// In useProtocol hook:
{
  account: "0x...",           // Connected wallet address
  provider: BrowserProvider,  // Read-only provider
  signer: JsonRpcSigner,      // For transactions
  
  lending: Contract,          // LendingBorrowing contract instance
  oracle: Contract,           // CryptoOracle contract instance
  
  prices: {                   // Real-time oracle prices
    BTC: 67000,
    ETH: 2600,
    BNB: 610,
    USDT: 1.00,
    SUI: 3.50
  },
  
  decimals: {                 // Token decimal places (cached)
    BTC: 18,
    ETH: 18,
    BNB: 18,
    USDT: 18,
    SUI: 18
  },
  
  ltv: 50                     // Loan-to-value ratio in percent
}
```

---

## 🔐 Security Considerations

### Access Control
```solidity
// Only owner can update prices
modifier onlyOwner() {
    require(msg.sender == owner, "only owner");
    _;
}

// Applied to:
- CryptoOracle.updatePrice()
- LendingBorrowing.setToken()
- LendingBorrowing.setLTV()
```

### Input Validation
```solidity
// All amounts must be > 0
require(amount > 0, "amount zero");

// Tokens must be registered
require(tokenBySymbol[symbol] != address(0), "token not set");

// Must have sufficient balance
require(deposits[msg.sender][symbol] >= amount, "insufficient deposit");

// Price data must be available
require(pCollateral > 0 && pBorrow > 0, "oracle price missing");

// LTV limit
require(newLTV <= 90, "LTV too high");
```

### Liquidation Rules
```solidity
// Can only liquidate unhealthy positions
require(hf < 100, "borrower healthy");

// Liquidator must repay real debt
require(v.borrowerDebt > 0, "no borrower debt");

// Collateral must be sufficient
require(v.borrowerCollBalance >= v.seizedCollateral, "not enough collateral");

// Actual repay amount capped at debt
v.actualRepay = repayAmount > v.borrowerDebt ? v.borrowerDebt : repayAmount;
```

---

## 📊 Economic Model

### Liquidity Pool
```
For each token:
  Total Available = Pool Balance
  Used for Borrows = Sum of all borrows[user][token]
  Utilization = Used / Total
  
Example (ETH):
  Initial: 50,000 ETH
  User A deposits: 100 ETH
  User B borrows: 50 ETH
  
  After:
    Total: 50,100 ETH
    Available to borrow: 50,050 ETH
    Utilization: 0.1%
```

### Collateral Requirement
```
Collateral: ETH (only)
LTV: 50%

Max Borrow = (Collateral Amount × Collateral Price × LTV) / Borrow Token Price

Example:
  Your collateral: 10 ETH @ $2,600 = $26,000
  LTV: 50%
  Max borrow in USDT: ($26,000 × 50%) / $1 = $13,000 USDT
```

### Liquidation Incentive
```
When Position Becomes Unhealthy (HF < 100%):
  Liquidator repays debt
  Receives collateral + 5% bonus
  
Example:
  Borrow: 10,000 USDT @ $1 = $10,000
  Collateral: 10 ETH @ $2,000 = $20,000
  LTV: 50% → Max borrow $10,000
  
  Position healthy: HF = 100%
  
  Price drops: ETH = $1,500
  Collateral now: 10 ETH @ $1,500 = $15,000
  HF = (15,000 × 50%) / 10,000 = 75% ⚠️ Liquidatable
  
  Liquidator repays: 5,000 USDT
  Receives: (5,000 × 1.05) / 1,500 = 3.5 ETH
  Profit: $1,750 (5% of repay value)
```

---

## 🔄 Transaction Flow Examples

### Complete User Journey

#### Step 1: Connect Wallet
```javascript
const protocol = useProtocol();
await protocol.connect();
// Now account = "0x..." and contracts are ready
```

#### Step 2: Supply ETH
```javascript
await protocol.approve("ETH", "100");
await protocol.deposit("ETH", "100");
// Balance: 100 ETH deposited
// Can borrow up to: 50 ETH worth of tokens
```

#### Step 3: Borrow USDT
```javascript
await protocol.borrow("USDT", "50000");
// Borrow 50,000 USDT (~$50,000)
// Health Factor = (100 × 2600 × 0.5) / 50000 = 260% ✅ Safe
```

#### Step 4: Check Health Factor
```javascript
const hf = await protocol.getHealthFactor("0x...", ["USDT", "BTC"]);
// Returns: 260 (meaning 260%)
```

#### Step 5: Liquidation Scenario
```javascript
// If ETH price drops to $1,300:
// Collateral value: 100 × 1,300 = $130,000
// HF = (130,000 × 0.5) / 50,000 = 130% → Still safe

// If ETH price drops to $1,000:
// Collateral value: 100 × 1,000 = $100,000
// HF = (100,000 × 0.5) / 50,000 = 100% → On edge

// If ETH price drops to $900:
// Collateral value: 100 × 900 = $90,000
// HF = (90,000 × 0.5) / 50,000 = 90% → 🔴 LIQUIDATABLE

// Liquidator can now:
await protocol.approve("USDT", "25000");
await protocol.lending.liquidate(borrower, "USDT", "25000");
// Receives: (25000 × 1.05) / 900 = 29.17 ETH
// Borrower loses: 29.17 ETH
```

---

## 🎯 Contract Interaction Pattern

### Calling Functions from Frontend

#### View Functions (Read-only)
```javascript
// No approval needed, no transaction cost
const deposit = await lending.getDeposit(userAddress, "ETH");
const borrow = await lending.getBorrow(userAddress, "USDT");
const price = await oracle.getPrice("BTC");
```

#### State-Changing Functions (Require Approval)
```javascript
// For ERC20 transfers (approve first):
const token = new Contract(tokenAddress, erc20Abi, signer);
const tx1 = await token.approve(lendingAddress, amount);
await tx1.wait();

// Then call lending contract:
const tx2 = await lending.deposit("ETH", amount);
await tx2.wait();
```

#### State-Changing Functions (No Approval)
```javascript
// These transfer from contract (already owns tokens):
const tx = await lending.borrow("USDT", amount);
await tx.wait();

const tx = await lending.withdraw("ETH", amount);
await tx.wait();

const tx = await lending.repay("USDT", amount);
await tx.wait();
```

---

## 📈 Protocol Metrics

After deployment with initial setup:

| Metric | Value |
|--------|-------|
| Total Liquidity (USD) | ~$2.26M |
| Collateral Token | ETH |
| LTV | 50% |
| Max Protocol Borrow | ~$1.13M |
| Liquidation Bonus | 5% |
| Price Update Frequency | 30 seconds |
| Supported Tokens | 5 (BTC, ETH, BNB, USDT, SUI) |
| Initial Pool Size (ETH) | 50,000 |
| Initial Pool Size (BTC) | 500 |
| Initial Pool Size (BNB) | 2,000,000 |
| Initial Pool Size (USDT) | 2,000,000 |
| Initial Pool Size (SUI) | 2,000,000 |

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Borrow
```
Setup:
  - User has 100 ETH @ $2,600
  - Wants to borrow USDT @ $1
  
Action:
  - Deposit 100 ETH
  - Borrow 50,000 USDT (50% of $260,000)
  
Expected:
  - Deposit succeeds ✅
  - Borrow succeeds ✅
  - HF = 260% ✅
```

### Scenario 2: Exceed LTV
```
Setup:
  - User has 100 ETH @ $2,600
  - Tries to borrow > $130,000 USDT
  
Expected:
  - Borrow fails ❌
  - Error: "exceeds LTV" ❌
```

### Scenario 3: Liquidation
```
Setup:
  - User deposits 100 ETH, borrows 100,000 USDT
  - Price drops to $800/ETH
  - HF = 40% (liquidatable)
  
Expected:
  - Liquidator calls liquidate()
  - Liquidator repays some USDT
  - Liquidator receives collateral + 5% bonus ✅
  - Borrower's position improves ✅
```

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Protocol:** Aave-like DeFi v1
