// src/components/OwnerTransfer.jsx
import React, { useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import erc20Abi from "../abi/ERC20ABI.json";
import { config } from "../config";

export default function OwnerTransfer() {
  const [token, setToken] = useState(Object.keys(config.tokens)[0]);
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const symbols = Object.keys(config.tokens);

  // Get decimals for a token
  const getDecimals = async (provider, symbol) => {
    try {
      const tokenAddr = config.tokens[symbol];
      const c = new Contract(tokenAddr, erc20Abi, provider);
      const d = await c.decimals();
      return Number(d);
    } catch {
      return 18;
    }
  };

  const sendTokens = async () => {
    if (!window.ethereum) return alert("MetaMask required");
    if (!receiver) return alert("Enter receiver address");
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");

    try {
      setStatus("Connecting wallet...");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tokenAddress = config.tokens[token];
      const tokenContract = new Contract(tokenAddress, erc20Abi, signer);

      const decimals = await getDecimals(provider, token);
      const amt = parseUnits(amount.toString(), decimals);

      setStatus(`Sending ${amount} ${token}...`);

      const tx = await tokenContract.transfer(receiver, amt);
      await tx.wait();

      setStatus(`Success! Tx: ${tx.hash}`);
      setAmount("");
      setReceiver("");
    } catch (err) {
      console.error(err);
      setStatus("Error: " + (err.reason || err.message));
    }
  };

  return (
    <div className="bg-slate-800 p-4 rounded shadow mt-6">
      <h2 className="font-semibold mb-3">Owner: Transfer Mock Tokens</h2>

      {/* Token selection */}
      <label className="text-sm text-slate-300">Token</label>
      <select
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full p-2 bg-slate-700 rounded mb-3"
      >
        {symbols.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Receiver Address */}
      <label className="text-sm text-slate-300">Receiver Address</label>
      <input
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
        placeholder="0xReceiverAddress"
        className="w-full p-2 bg-slate-700 rounded mb-3"
      />

      {/* Amount */}
      <label className="text-sm text-slate-300">Amount</label>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-full p-2 bg-slate-700 rounded mb-3"
      />

      <button
        onClick={sendTokens}
        className="w-full py-2 bg-indigo-600 rounded"
      >
        Send Tokens
      </button>

      {status && <div className="mt-3 text-sm text-slate-300">{status}</div>}
    </div>
  );
}
