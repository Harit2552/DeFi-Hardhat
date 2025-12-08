import React, { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import oracleAbi from "../abi/livePricesABI.json";
import { config } from "../config";

export default function LivePrices() {
  const [provider, setProvider] = useState(null);
  const [oracle, setOracle] = useState(null);
  const [prices, setPrices] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  const symbols = ["BTC", "ETH", "BNB", "USDT", "SUI"];

  // Setup provider
  useEffect(() => {
    if (window.ethereum) {
      const p = new BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  // Setup contract
  useEffect(() => {
    if (!provider) return;
    const o = new Contract(config.oracleAddress, oracleAbi, provider);
    setOracle(o);
  }, [provider]);

  // Fetch prices function
  const fetchPrices = async () => {
    if (!oracle) return;

    const all = {};

    for (const s of symbols) {
      try {
        const p = await oracle.getPrice(s);
        all[s] = Number(p) / 100;
      } catch (err) {
        console.error(`Failed to fetch ${s}:`, err);
        all[s] = 0;
      }
    }

    setPrices(all);
    setLastUpdate(new Date().toLocaleTimeString());
  };

  // Auto update every 5s
  useEffect(() => {
    if (!oracle) return;
    fetchPrices();
    const id = setInterval(fetchPrices, 5000);
    return () => clearInterval(id);
  }, [oracle]);

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 text-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>📊</span> Live Oracle Prices
        </h2>
        <div className="text-xs text-slate-400">
          Updated: {lastUpdate || "--:--:--"}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {symbols.map((sym) => (
          <div
            key={sym}
            className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500/50 transition"
          >
            <div className="text-sm text-slate-400 mb-2">{sym}</div>
            <div className="text-lg font-bold text-cyan-400">
              ${typeof prices[sym] === "number" ? prices[sym].toFixed(2) : "..."}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {prices[sym] > 0 ? "Live" : "Fetching..."}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500 mt-4 text-center">
        Prices fetched from on-chain oracle. Updates every 5 seconds.
      </div>
    </div>
  );
}
