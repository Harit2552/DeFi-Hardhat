// src/components/DeFiDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

import lendingAbi from "../abi/contractABI.json";
import oracleAbi from "../abi/livePricesABI.json";
import erc20Abi from "../abi/ERC20ABI.json";
import { config } from "../config";

export default function DeFiDashboard() {
  // ---------------- Wallet States ----------------
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // ---------------- Contract Instances ----------------
  const [lending, setLending] = useState(null);
  const [oracle, setOracle] = useState(null);

  // ---------------- Data States ----------------
  const [balances, setBalances] = useState({});
  const [deposits, setDeposits] = useState({});
  const [borrows, setBorrows] = useState({});
  const [prices, setPrices] = useState({});
  const [pool, setPool] = useState({});
  const [decimalsMap, setDecimalsMap] = useState({});
  const [selected, setSelected] = useState(Object.keys(config.tokens)[0] || "ETH");
  const [amount, setAmount] = useState("");
  const [working, setWorking] = useState(false);

  const symbols = Object.keys(config.tokens);

  // NEW health factor
  const [ltv, setLtv] = useState(0);
  const [healthFactor, setHealthFactor] = useState(null);

  // ---------------- Connect Wallet ----------------
  const connect = async () => {
    if (!window.ethereum) return alert("MetaMask required");

    try {
      const p = new BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const addr = await s.getAddress();

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setIsConnected(true);

      setLending(new Contract(config.lendingBorrowAddress, lendingAbi, s));
      setOracle(new Contract(config.oracleAddress, oracleAbi, p));

      console.log("Connected:", addr);
    } catch (err) {
      console.error("Connect error:", err);
    }
  };

  // ---------------- Disconnect Wallet ----------------
  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setIsConnected(false);
    setLending(null);
    setOracle(null);
    setBalances({});
    setDeposits({});
    setBorrows({});
    setPrices({});
    setPool({});
    setHealthFactor(null);

    console.log("Wallet disconnected");
  };

  // ---------------- Detect Account & Chain Change ----------------
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        console.log("Account changed → reconnecting...");
        await connect();
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ---------------- Get Token Decimals ----------------
  const getDecimals = useCallback(
    async (symbol) => {
      if (decimalsMap[symbol]) return decimalsMap[symbol];
      try {
        const tokenAddr = config.tokens[symbol];
        const token = new Contract(tokenAddr, erc20Abi, provider);
        const d = await token.decimals();
        setDecimalsMap((m) => ({ ...m, [symbol]: Number(d) }));
        return Number(d);
      } catch {
        setDecimalsMap((m) => ({ ...m, [symbol]: 18 }));
        return 18;
      }
    },
    [provider, decimalsMap]
  );

  // ---------------- Fetch All Data ----------------
  const fetchAll = useCallback(async () => {
    if (!provider || !lending || !oracle || !account) return;

    setWorking(true);
    try {
      const newBalances = {};
      const newDeposits = {};
      const newBorrows = {};
      const newPrices = {};
      const newPool = {};

      // get LTV
      try {
        const l = await (lending.getLTV ? lending.getLTV() : lending.LTV());
        setLtv(Number(l));
      } catch {
        setLtv(50);
      }

      await Promise.all(
        symbols.map(async (sym) => {
          const tokenAddr = config.tokens[sym];
          const token = new Contract(tokenAddr, erc20Abi, provider);
          const dec = await getDecimals(sym);

          // wallet balance
          let rawBal = 0n;
          try {
            rawBal = await token.balanceOf(account);
          } catch {}
          newBalances[sym] = Number(formatUnits(rawBal, dec));

          // deposits
          let rawDep = 0n;
          try {
            rawDep = await lending.getDeposit(account, sym);
          } catch {}
          newDeposits[sym] = Number(formatUnits(rawDep, dec));

          // borrows
          let rawBor = 0n;
          try {
            rawBor = await lending.getBorrow(account, sym);
          } catch {}
          newBorrows[sym] = Number(formatUnits(rawBor, dec));

          // price
          try {
            const rawPrice = await oracle.getPrice(sym);
            newPrices[sym] = Number(rawPrice) / 100;
          } catch {
            newPrices[sym] = 0;
          }

          // pool liquidity
          try {
            const rawPool = await lending.totalLiquidity(sym);
            newPool[sym] = Number(formatUnits(rawPool, dec));
          } catch {
            newPool[sym] = 0;
          }
        })
      );

      setBalances(newBalances);
      setDeposits(newDeposits);
      setBorrows(newBorrows);
      setPrices(newPrices);
      setPool(newPool);

      // compute health factor
      let totalBorrowUSD = 0;
      for (const s of symbols) {
        totalBorrowUSD += (newBorrows[s] || 0) * (newPrices[s] || 0);
      }

      const collSym = config.collateralSymbol || symbols[0];
      const collateralValue = (newDeposits[collSym] || 0) * (newPrices[collSym] || 0);

      let hf = null;
      if (totalBorrowUSD === 0) hf = Number.MAX_SAFE_INTEGER;
      else hf = (collateralValue * (ltv || 50)) / totalBorrowUSD;

      setHealthFactor(hf);
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setWorking(false);
    }
  }, [provider, lending, oracle, account, symbols, getDecimals, ltv]);

  // poll every 8 seconds
  useEffect(() => {
    if (!lending || !oracle || !account) return;
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, [lending, oracle, account, fetchAll]);

  // ---------------- Borrow Limit Math ----------------
  const getTotalBorrowUSD = () => {
    return symbols.reduce(
      (sum, s) => sum + (borrows[s] || 0) * (prices[s] || 0),
      0
    );
  };

  const getCollateralUSD = () => {
    const collSym = config.collateralSymbol || symbols[0];
    return (deposits[collSym] || 0) * (prices[collSym] || 0);
  };

  const getBorrowLimits = () => {
    const collateralUSD = getCollateralUSD();
    const maxBorrowUSD = collateralUSD * (ltv / 100);
    const totalBorrowedUSD = getTotalBorrowUSD();
    const remaining = Math.max(maxBorrowUSD - totalBorrowedUSD, 0);
    const safeBorrow = remaining * 0.8;

    return {
      collateralUSD,
      maxBorrowUSD,
      totalBorrowedUSD,
      remaining,
      safeBorrow,
      usagePercent:
        maxBorrowUSD === 0 ? 0 : (totalBorrowedUSD / maxBorrowUSD) * 100,
    };
  };

  // ---------------- Approval Helper ----------------
  const ensureApproval = async (symbol, amtBigInt) => {
    if (!signer) throw new Error("Wallet not connected");

    const tokenAddr = config.tokens[symbol];
    const tokenWithSigner = new Contract(tokenAddr, erc20Abi, signer);
    const spender = lending.target || lending.address;

    let allowance = 0n;
    try {
      allowance = await tokenWithSigner.allowance(account, spender);
    } catch {
      allowance = 0n;
    }

    if (allowance < amtBigInt) {
      const tx = await tokenWithSigner.approve(spender, amtBigInt);
      await tx.wait();
    }
  };

  // ---------------- Deposit / Withdraw / Borrow / Repay ----------------
  const doDeposit = async () => {
    if (!isConnected) return alert("Connect wallet");
    if (!amount || Number(amount) <= 0) return alert("Enter amount");

    try {
      const dec = await getDecimals(selected);
      const amt = parseUnits(amount, dec);
      await ensureApproval(selected, amt);
      const tx = await lending.deposit(selected, amt);
      await tx.wait();
      fetchAll();
      setAmount("");
    } catch (e) {
      alert("Deposit failed: " + e.message);
    }
  };

  const doWithdraw = async () => {
    if (!isConnected) return alert("Connect wallet");
    if (!amount || Number(amount) <= 0) return alert("Enter amount");

    try {
      const dec = await getDecimals(selected);
      const amt = parseUnits(amount, dec);
      const tx = await lending.withdraw(selected, amt);
      await tx.wait();
      fetchAll();
      setAmount("");
    } catch (e) {
      alert("Withdraw failed: " + e.message);
    }
  };

  const doBorrow = async () => {
    if (!isConnected) return alert("Connect wallet");
    if (!amount || Number(amount) <= 0) return alert("Enter amount");

    // Check LTV BEFORE sending TX
    const stats = getBorrowLimits();
    const borrowUSD = Number(amount) * (prices[selected] || 0);

    if (borrowUSD > stats.remaining) {
      return alert(`Borrow exceeds LTV! Max remaining: $${stats.remaining.toFixed(2)}`);
    }

    try {
      const dec = await getDecimals(selected);
      const amt = parseUnits(amount, dec);
      const tx = await lending.borrow(selected, amt);
      await tx.wait();
      fetchAll();
      setAmount("");
    } catch (e) {
      alert("Borrow failed: " + e.message);
    }
  };

  const doRepay = async () => {
    if (!isConnected) return alert("Connect wallet");
    if (!amount || Number(amount) <= 0) return alert("Enter amount");

    try {
      const dec = await getDecimals(selected);
      const amt = parseUnits(amount, dec);
      await ensureApproval(selected, amt);
      const tx = await lending.repay(selected, amt);
      await tx.wait();
      fetchAll();
      setAmount("");
    } catch (e) {
      alert("Repay failed: " + e.message);
    }
  };

  const doLiquidate = async () => {
    if (!isConnected) return alert("Connect wallet");

    const borrower = window.prompt("Borrower address:");
    if (!borrower) return;

    const repayAmt = window.prompt(`Repay amount in ${selected}:`);
    if (!repayAmt) return;

    try {
      const dec = await getDecimals(selected);
      const amt = parseUnits(repayAmt, dec);

      await ensureApproval(selected, amt);
      const tx = await lending.liquidate(borrower, selected, amt);
      await tx.wait();

      fetchAll();
      alert("Liquidation completed");
    } catch (e) {
      alert("Liquidation failed: " + e.message);
    }
  };

  const totalDepositedUSD = () => {
    return symbols.reduce(
      (sum, s) => sum + (deposits[s] || 0) * (prices[s] || 0),
      0
    ).toFixed(2);
  };

  const displayHF = () => {
    if (healthFactor === null) return "-";
    if (healthFactor === Number.MAX_SAFE_INTEGER) return "∞";
    return healthFactor.toFixed(2) + "%";
  };

  // ---------------- Render UI ----------------
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">DeFi Dashboard</h1>
            <p className="text-sm text-slate-400">Live prices, deposits, borrows & pool</p>
          </div>

          {/* Wallet UI */}
          <div>
            {!isConnected ? (
              <button className="px-4 py-2 bg-indigo-600 rounded" onClick={connect}>
                Connect MetaMask
              </button>
            ) : (
              <div className="text-right">
                <div className="text-sm text-slate-400">Connected</div>
                <div className="font-mono text-xs">{account}</div>

                <button
                  className="mt-2 px-3 py-1 bg-red-600 rounded text-xs"
                  onClick={disconnect}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Deposited */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h3 className="text-sm text-slate-300">Total Deposited (USD)</h3>
            <div className="text-2xl font-bold">${totalDepositedUSD()}</div>
          </div>

          {/* Live Prices */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h3 className="text-sm text-slate-300">Live Prices</h3>
            <div className="mt-2">
              {symbols.map((s) => (
                <div key={s} className="flex justify-between text-sm py-1">
                  <span>{s}</span>
                  <span className="font-mono">${prices[s] ?? "-"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Health Factor */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h3 className="text-sm text-slate-300">Health Factor</h3>
            <div className="text-2xl font-bold">{displayHF()}</div>
            <div className="text-xs text-slate-400">LTV: {ltv}%</div>
          </div>

          {/* -------- Borrow Limit Card (NEW) -------- */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h3 className="text-sm text-slate-300">Borrow Limit</h3>

            {(() => {
              const stats = getBorrowLimits();

              return (
                <div className="mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Borrowed</span>
                    <span>${stats.totalBorrowedUSD.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Max Borrow</span>
                    <span>${stats.maxBorrowUSD.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span>${stats.remaining.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between mt-2 text-emerald-400">
                    <span>Recommended (80%)</span>
                    <span>${stats.safeBorrow.toFixed(2)}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700 h-2 rounded mt-3">
                    <div
                      className="bg-indigo-500 h-2 rounded"
                      style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
                    ></div>
                  </div>

                  <div className="text-xs text-slate-400 mt-1">
                    Used: {stats.usagePercent.toFixed(2)}%
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Actions + Account Snapshot + Pool */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Action Panel */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h3 className="text-sm text-slate-300 mb-2">Actions</h3>

            <select
              className="w-full p-2 bg-slate-700 rounded mb-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              className="w-full p-2 bg-slate-700 rounded mb-2"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-emerald-600 rounded" onClick={doDeposit} disabled={working}>Deposit</button>
              <button className="flex-1 py-2 bg-yellow-600 rounded" onClick={doWithdraw} disabled={working}>Withdraw</button>
              <button className="flex-1 py-2 bg-blue-600 rounded" onClick={doBorrow} disabled={working}>Borrow</button>
              <button className="flex-1 py-2 bg-red-600 rounded" onClick={doRepay} disabled={working}>Repay</button>
            </div>

            <button className="w-full mt-3 py-2 bg-pink-600 rounded" onClick={doLiquidate} disabled={working}>
              Liquidate
            </button>
          </div>

          {/* Account Snapshot */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Account Snapshot</h2>

            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th>Token</th>
                  <th>Wallet</th>
                  <th>Deposited</th>
                  <th>Borrowed</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>
                {symbols.map((s) => (
                  <tr key={s} className="border-t border-slate-700">
                    <td className="py-2">{s}</td>
                    <td className="py-2">{(balances[s] ?? 0).toFixed(4)}</td>
                    <td className="py-2">{(deposits[s] ?? 0).toFixed(4)}</td>
                    <td className="py-2">{(borrows[s] ?? 0).toFixed(4)}</td>
                    <td className="py-2">${prices[s] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pool Liquidity */}
          <div className="bg-slate-800 p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Pool Liquidity</h2>

            {symbols.map((s) => (
              <div key={s} className="flex justify-between py-2 border-b border-slate-700">
                <span>{s}</span>
                <span>{(pool[s] ?? 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-slate-500 mt-8">
          Local Hardhat • Live Oracle • Lending Protocol Prototype
        </footer>
      </div>
    </div>
  );
}
