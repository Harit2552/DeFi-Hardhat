# DeFi Protocol - Troubleshooting Guide

## 🔍 Common Issues & Solutions

### 1. **"No provider selected"** Error

**Symptom:**
```
Error: No provider selected
at Navbar.jsx:12
```

**Cause:** MetaMask not connected or wallet connection failed

**Solution:**
1. Check MetaMask extension is installed
2. Click "Connect" button on navbar
3. Approve wallet connection in MetaMask popup
4. Ensure you're on "Hardhat" network in MetaMask

**Verification:**
- MetaMask should show "Hardhat" in network dropdown
- Account address should display in navbar

---

### 2. **"LendingBorrowing Contract Not Found"** Error

**Symptom:**
```
Error: call revert exception
LendingBorrowing at <address>
```

**Cause:** Contract address in `config.js` is incorrect or deployment failed

**Solution:**
1. Check Hardhat node is running (`npx hardhat node`)
2. Redeploy contracts: `npx hardhat run scripts/deployAll.js --network localhost`
3. Copy EXACT addresses from deployment output
4. Update `frontend/src/config.js` with new addresses
5. Refresh browser (Ctrl+R or Cmd+R)

**Debug:**
```javascript
// Check config in browser console:
console.log(config.lendingBorrowAddress);
console.log(config.tokens);
```

---

### 3. **"Insufficient Balance for Gas"** Error

**Symptom:**
```
Error: insufficient funds for gas
```

**Cause:** Wallet has no ETH balance or gas estimation failed

**Solution:**
1. In MetaMask, you should have automatic balance (Hardhat gives unlimited)
2. If not, reset MetaMask account:
   - Settings → Advanced → Reset Account
3. Re-import private key:
   - `0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded87391dda1db2a067b74`

**Verify Balance:**
- MetaMask should show balance in ETH
- If not showing, check network is set to "Hardhat"

---

### 4. **"Token Not Set"** Error

**Symptom:**
```
Error: token not set
at LendingBorrowing.sol:105
```

**Cause:** Token address not registered in contract or symbol typo

**Solution:**
1. Check spelling: "BTC", "ETH", "BNB", "USDT", "SUI" (case-sensitive)
2. Verify deployment completed all `setToken()` calls
3. Check contract was initialized properly:
   ```solidity
   // Should show addresses:
   await lending.tokenBySymbol("ETH");  // Should return address, not 0x0
   ```

**Prevention:**
- Use exact symbols from deployment script
- Don't modify token symbols in UI or contract

---

### 5. **"Insufficient Deposit"** Error on Withdraw

**Symptom:**
```
Error: insufficient deposit
at LendingBorrowing.sol:112
```

**Cause:** Trying to withdraw more than deposited

**Solution:**
1. Check actual deposit amount in Portfolio
2. Enter smaller amount
3. Account for decimal precision (visible in UI)

**Example:**
- Deposited: 10.5 ETH
- Trying to withdraw: 11 ETH ❌
- Should withdraw: ≤ 10.5 ETH ✅

---

### 6. **"Exceeds LTV"** Error on Borrow

**Symptom:**
```
Error: exceeds LTV
at LendingBorrowing.sol:131
```

**Cause:** Trying to borrow more than allowed by collateral

**Solution:**
1. Calculate max borrow:
   ```
   Max Borrow = (Collateral Amount × Collateral Price × LTV%) / Borrow Token Price
   
   Example:
   - Your ETH: 10 @ $2,600 = $26,000
   - LTV: 50%
   - Max: $26,000 × 50% = $13,000 USDT
   ```

2. Reduce borrow amount below max
3. Or deposit more ETH collateral first

**Verification:**
```javascript
// In browser console:
const hf = await contract.getHealthFactor(account, ["USDT"]);
console.log("HF:", hf, "Must be >= 100 after borrow");
```

---

### 7. **"Oracle Price Missing"** Error

**Symptom:**
```
Error: oracle price missing
at LendingBorrowing.sol:125
```

**Cause:** Oracle hasn't updated price for that token

**Solution:**
1. Start oracle update script in new terminal:
   ```powershell
   $env:ORACLE_ADDRESS="0xe7f1725..."
   $env:PRIVATE_KEY="0xac0974..."
   npx hardhat run scripts/updatePrices.js --network localhost
   ```

2. Wait 30 seconds for first update
3. Retry borrow transaction

**Debug:**
```javascript
// Check price is set:
const price = await oracle.getPrice("ETH");
console.log("Price:", price); // Should not be 0
```

---

### 8. **Frontend Crashes on Supply/Borrow**

**Symptom:**
```
Error: undefined is not an object
TypeError: Cannot read property 'approve' of undefined
```

**Cause:** Wallet not connected properly

**Solution:**
1. Click "Connect" button again
2. Check browser console for errors
3. Clear browser cache (F12 → Application → Clear Site Data)
4. Refresh page (Ctrl+Shift+R hard refresh)
5. Reconnect wallet

---

### 9. **MetaMask "Nonce Too Low"** Error

**Symptom:**
```
Error: the tx doesn't have the correct nonce. Expected nonce: X but got: Y
```

**Cause:** Transaction nonce out of sync with blockchain

**Solution:**
1. In MetaMask Settings → Advanced → Reset Account
2. Don't change this again for same account
3. If frequent, use different account

**Prevention:**
- Don't send transactions rapidly in succession
- Wait for one to confirm before sending next

---

### 10. **Prices Not Updating in UI**

**Symptom:**
- Oracle prices stuck at same value
- Or showing "ERR" or "..."

**Cause:** Oracle service not running or prices not being fetched

**Solution:**
1. Check updatePrices.js is running in terminal
2. Look for errors in that terminal
3. Verify environment variables:
   ```powershell
   $env:ORACLE_ADDRESS  # Should show address
   $env:PRIVATE_KEY     # Should show key
   ```

4. Restart oracle script:
   ```powershell
   # Ctrl+C to stop
   # Then run again with correct vars
   ```

**Verify Connection:**
```javascript
// In browser console:
const p = await oracle.getPrice("BTC");
console.log("BTC Price:", p); // Should be 6700000 or similar
```

---

### 11. **"No Liquidity"** Error on Borrow

**Symptom:**
```
Error: no liquidity
at LendingBorrowing.sol:133
```

**Cause:** Trying to borrow more than available in pool

**Solution:**
1. Check liquidity in that token (shown in Markets)
2. Borrow smaller amount
3. Wait for more deposits from other users

**Liquidity Status:**
```javascript
// Check in browser console:
const liq = await lending.totalLiquidity("USDT");
console.log("Available USDT:", liq / 1e18);
```

---

### 12. **Transaction Pending Forever**

**Symptom:**
- Transaction shows "Pending" for > 30 seconds
- Nothing happens after approval

**Cause:** Network congestion (rare on local) or transaction stack

**Solution:**
1. Check Hardhat node is still running
2. In MetaMask, go to Activity
3. Try to speed up or cancel transaction
4. Refresh page
5. If stuck, reset account (Settings → Advanced → Reset Account)

---

### 13. **Approve Transaction Not Showing**

**Symptom:**
- Click "Supply" → MetaMask doesn't pop up
- No approval confirmation window

**Cause:** Approve already called in this session or wallet connection issue

**Solution:**
1. Check if already approved:
   ```javascript
   // In console:
   const allowance = await token.allowance(account, lendingAddress);
   console.log("Allowance:", allowance); // If > 0, already approved
   ```

2. If already approved, just click deposit again
3. If not, refresh and retry

---

### 14. **Health Factor Shows "Infinity"**

**Symptom:**
- Portfolio shows "∞" for health factor
- This is normal

**Explanation:**
When you have no borrows, health factor is mathematically infinite (unlimited borrowing capacity). This is correct behavior. ✅

**When it matters:**
- HF appears when you have active borrows
- Shows as percentage (e.g., "250%")

---

### 15. **Can't Find Contract ABI**

**Symptom:**
```
Error: Could not find ABI
at useProtocol.js:8
```

**Cause:** ABI file path incorrect or file missing

**Solution:**
1. Check `frontend/src/abi/` folder exists
2. Should contain:
   - `contractABI.json` (LendingBorrowing)
   - `livePricesABI.json` (CryptoOracle)
   - `ERC20ABI.json` (token standard)

3. If missing, copy from `artifacts/` folder:
   ```bash
   cp artifacts/contracts/LendingBorrowing.sol/LendingBorrowing.json frontend/src/abi/contractABI.json
   ```

---

## 🆘 Reset Everything

If nothing works:

### Hard Reset
```powershell
# 1. Stop all terminals (Ctrl+C)

# 2. Clean build
rm -r artifacts cache frontend/node_modules node_modules

# 3. Reinstall
npm install
cd frontend
npm install
cd ..

# 4. Start fresh
npx hardhat node

# In new terminal:
npx hardhat run scripts/deployAll.js --network localhost

# Get new addresses and update config.js

# In another terminal:
# Set env vars and run updatePrices.js

# In frontend:
npm start
```

### Reset MetaMask
1. Open MetaMask
2. Settings → Advanced → Reset Account
3. Click "Reset"
4. Re-import private key
5. Switch to Hardhat network

### Factory Reset Frontend
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 🐛 Debug Mode

### Enable Logging
Add to `useProtocol.js`:
```javascript
const debug = true;

if (debug) {
  console.log("Account:", account);
  console.log("Prices:", prices);
  console.log("Decimals:", decimals);
}
```

### Check Contract State
```javascript
// In browser console:
const bal = await lending.getDeposit(account, "ETH");
const bor = await lending.getBorrow(account, "USDT");
const liq = await lending.totalLiquidity("ETH");
const ltv = await lending.LTV();

console.log({
  "Your ETH Deposit": bal.toString(),
  "Your USDT Borrow": bor.toString(),
  "Available Liquidity": liq.toString(),
  "LTV %": ltv.toString()
});
```

### Monitor Transactions
```javascript
// Listen for events
lending.on("Deposit", (user, symbol, amount, event) => {
  console.log("Deposit event:", { user, symbol, amount });
});

lending.on("Borrow", (user, symbol, amount, event) => {
  console.log("Borrow event:", { user, symbol, amount });
});
```

---

## 📞 Getting Help

### Check Logs
1. **Hardhat Node Terminal:** Shows all contract calls
2. **Browser Console:** F12 → Console tab
3. **Network Tab:** F12 → Network tab (see failed requests)
4. **Oracle Terminal:** Check price update status

### Common Error Messages
| Error | Meaning | Fix |
|-------|---------|-----|
| "only owner" | You're not contract owner | Use deployer account |
| "token not set" | Token address not configured | Run deployment script fully |
| "insufficient" | Not enough balance | Deposit more collateral |
| "no liquidity" | Pool depleted | Wait for more deposits |
| "oracle price" | Price not set | Start updatePrices.js |
| "no collateral" | Need ETH | Deposit ETH first |
| "exceeds LTV" | Borrowing limit exceeded | Reduce borrow or add collateral |
| "borrower healthy" | Can't liquidate safe position | Wait for HF < 100% |

---

## ✅ Pre-Flight Checklist

Before testing:
- [ ] Hardhat node running (`http://127.0.0.1:8545`)
- [ ] Contracts deployed and initialized
- [ ] Oracle update script running
- [ ] Frontend config.js updated with correct addresses
- [ ] MetaMask on "Hardhat" network
- [ ] MetaMask has ETH balance
- [ ] All 5 tokens showing correct balance in MetaMask

---

**Last Updated:** December 2024
**Version:** 1.0
