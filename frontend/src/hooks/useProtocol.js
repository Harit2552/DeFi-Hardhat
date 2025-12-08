import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, Contract, parseUnits, formatUnits } from "ethers";
import ERC20ABI from "../abi/ERC20ABI.json";
import contractABI from "../abi/contractABI.json";
import oracleABI from "../abi/livePricesABI.json";
import { config } from "../config";

export const useProtocol = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [lendingContract, setLendingContract] = useState(null);
  const [oracleContract, setOracleContract] = useState(null);
  const [decimalsMap, setDecimalsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Connect wallet
  const connect = useCallback(async () => {
    try {
      setError(null);
      if (!window.ethereum) {
        throw new Error("MetaMask not detected");
      }

      const p = new BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const addr = await s.getAddress();

      setProvider(p);
      setSigner(s);
      setAccount(addr);

      // Create contract instances
      const lending = new Contract(config.lendingBorrowAddress, contractABI, s);
      const oracle = new Contract(config.oracleAddress, oracleABI, p);

      setLendingContract(lending);
      setOracleContract(oracle);

      return { provider: p, signer: s, account: addr };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Get token decimals
  const getDecimals = useCallback(
    async (symbol) => {
      if (decimalsMap[symbol]) return decimalsMap[symbol];

      try {
        const tokenAddr = config.tokens[symbol];
        if (!tokenAddr) throw new Error(`Unknown token: ${symbol}`);

        const tokenContract = new Contract(tokenAddr, ERC20ABI, provider);
        const dec = await tokenContract.decimals();
        
        setDecimalsMap((prev) => ({ ...prev, [symbol]: dec }));
        return dec;
      } catch (err) {
        console.error(`Error fetching decimals for ${symbol}:`, err);
        return 18;
      }
    },
    [provider, decimalsMap]
  );

  // Fetch prices from oracle
  const fetchPrices = useCallback(async () => {
    try {
      if (!oracleContract) return {};

      const symbols = Object.keys(config.tokens);
      const prices = {};

      for (const sym of symbols) {
        try {
          const price = await oracleContract.getPrice(sym);
          prices[sym] = Number(price) / 100; // Oracle stores scaled by 100
        } catch (err) {
          console.error(`Failed to fetch price for ${sym}:`, err);
          prices[sym] = 0;
        }
      }

      return prices;
    } catch (err) {
      setError(err.message);
      return {};
    }
  }, [oracleContract]);

  // Fetch user balances
  const fetchBalances = useCallback(
    async (addr) => {
      try {
        if (!provider || !addr) return {};

        const symbols = Object.keys(config.tokens);
        const balances = {};

        for (const sym of symbols) {
          try {
            const tokenAddr = config.tokens[sym];
            const tokenContract = new Contract(tokenAddr, ERC20ABI, provider);
            const balance = await tokenContract.balanceOf(addr);
            const dec = await getDecimals(sym);
            balances[sym] = formatUnits(balance, dec);
          } catch (err) {
            console.error(`Error fetching balance for ${sym}:`, err);
            balances[sym] = "0";
          }
        }

        return balances;
      } catch (err) {
        setError(err.message);
        return {};
      }
    },
    [provider, getDecimals]
  );

  // Fetch user deposits
  const fetchDeposits = useCallback(
    async (addr) => {
      try {
        if (!lendingContract || !addr) return {};

        const symbols = Object.keys(config.tokens);
        const deposits = {};

        for (const sym of symbols) {
          try {
            const amount = await lendingContract.getDeposit(addr, sym);
            const dec = await getDecimals(sym);
            deposits[sym] = formatUnits(amount, dec);
          } catch (err) {
            console.error(`Error fetching deposit for ${sym}:`, err);
            deposits[sym] = "0";
          }
        }

        return deposits;
      } catch (err) {
        setError(err.message);
        return {};
      }
    },
    [lendingContract, getDecimals]
  );

  // Fetch user borrows
  const fetchBorrows = useCallback(
    async (addr) => {
      try {
        if (!lendingContract || !addr) return {};

        const symbols = Object.keys(config.tokens);
        const borrows = {};

        for (const sym of symbols) {
          try {
            const amount = await lendingContract.getBorrow(addr, sym);
            const dec = await getDecimals(sym);
            borrows[sym] = formatUnits(amount, dec);
          } catch (err) {
            console.error(`Error fetching borrow for ${sym}:`, err);
            borrows[sym] = "0";
          }
        }

        return borrows;
      } catch (err) {
        setError(err.message);
        return {};
      }
    },
    [lendingContract, getDecimals]
  );

  // Approve token
  const approve = useCallback(
    async (symbol, amount) => {
      try {
        setLoading(true);
        setError(null);

        if (!signer) throw new Error("Wallet not connected");

        const tokenAddr = config.tokens[symbol];
        const tokenContract = new Contract(tokenAddr, ERC20ABI, signer);
        const dec = await getDecimals(symbol);
        const amountBN = parseUnits(amount, dec);

        const tx = await tokenContract.approve(config.lendingBorrowAddress, amountBN);
        await tx.wait();

        return tx;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer, getDecimals]
  );

  // Deposit
  const deposit = useCallback(
    async (symbol, amount) => {
      try {
        setLoading(true);
        setError(null);

        if (!lendingContract || !signer) throw new Error("Not connected");

        const dec = await getDecimals(symbol);
        const amountBN = parseUnits(amount, dec);

        // Approve first
        await approve(symbol, amount);

        // Deposit
        const tx = await lendingContract.deposit(symbol, amountBN);
        await tx.wait();

        return tx;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [lendingContract, signer, getDecimals, approve]
  );

  // Withdraw
  const withdraw = useCallback(
    async (symbol, amount) => {
      try {
        setLoading(true);
        setError(null);

        if (!lendingContract) throw new Error("Not connected");

        const dec = await getDecimals(symbol);
        const amountBN = parseUnits(amount, dec);

        const tx = await lendingContract.withdraw(symbol, amountBN);
        await tx.wait();

        return tx;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [lendingContract, getDecimals]
  );

  // Borrow
  const borrow = useCallback(
    async (symbol, amount) => {
      try {
        setLoading(true);
        setError(null);

        if (!lendingContract) throw new Error("Not connected");

        const dec = await getDecimals(symbol);
        const amountBN = parseUnits(amount, dec);

        const tx = await lendingContract.borrow(symbol, amountBN);
        await tx.wait();

        return tx;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [lendingContract, getDecimals]
  );

  // Repay
  const repay = useCallback(
    async (symbol, amount) => {
      try {
        setLoading(true);
        setError(null);

        if (!lendingContract || !signer) throw new Error("Not connected");

        const dec = await getDecimals(symbol);
        const amountBN = parseUnits(amount, dec);

        // Approve first
        await approve(symbol, amount);

        // Repay
        const tx = await lendingContract.repay(symbol, amountBN);
        await tx.wait();

        return tx;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [lendingContract, signer, getDecimals, approve]
  );

  // Get health factor
  const getHealthFactor = useCallback(
    async (addr) => {
      try {
        if (!lendingContract || !addr) return 0;

        const symbols = Object.keys(config.tokens);
        const borrowSymbols = symbols.filter((s) => s !== config.collateralSymbol);

        const hf = await lendingContract.getHealthFactor(addr, borrowSymbols);
        return Number(hf);
      } catch (err) {
        console.error("Error fetching health factor:", err);
        return 0;
      }
    },
    [lendingContract]
  );

  return {
    provider,
    signer,
    account,
    lendingContract,
    oracleContract,
    loading,
    error,
    connect,
    fetchPrices,
    fetchBalances,
    fetchDeposits,
    fetchBorrows,
    approve,
    deposit,
    withdraw,
    borrow,
    repay,
    getHealthFactor,
    getDecimals,
  };
};
