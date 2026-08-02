"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';

// Dynamic Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

// Minimal ERC-20 ABI required for approving and sending transfers
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Deployed Escrow Contract Address on Base Sepolia
const ESCROW_CONTRACT_ADDRESS = "0x1ECe9DB2A83559D0F276aEb0c60a1408d65918cc";

// Mock/Test Token Address on Base Sepolia (Base Sepolia Test USDC)
const MOCK_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export default function Home() {
  // AppKit Hooks for global wallet state & active provider
  const { address: account, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  const [amount, setAmount] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("USDT");
  const [targetCurrency, setTargetCurrency] = useState("NGN");
  const [bankCode, setBankCode] = useState("044");
  const [accountNumber, setAccountNumber] = useState("");

  // Rate & Currency Config States
  const [exchangeRate, setExchangeRate] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState("₦");
  const [serviceFeePercent, setServiceFeePercent] = useState(1.5);
  const [flatFee, setFlatFee] = useState(100);

  // Validation States
  const [accountName, setAccountName] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Fetch Exchange Rate when token or target currency changes
  useEffect(() => {
    fetchExchangeRate();
  }, [tokenSymbol, targetCurrency]);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/rate?symbol=${tokenSymbol}&currency=${targetCurrency}`
      );
      const data = await res.json();
      if (data.status === "success") {
        setExchangeRate(data.data.rate);
        setCurrencySymbol(data.data.currencySymbol);
        setServiceFeePercent(data.data.serviceFeePercent);
        setFlatFee(data.data.flatFee);
      }
    } catch (err) {
      console.error("Failed to fetch rate", err);
    }
  };

  // Auto-verify account number
  useEffect(() => {
    if (accountNumber.length === 10) {
      handleAccountVerification();
    } else {
      setAccountName("");
      setAccountError("");
    }
  }, [accountNumber, bankCode]);

  const handleAccountVerification = async () => {
    setIsVerifyingAccount(true);
    setAccountError("");
    setAccountName("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setAccountName(data.data.accountName);
      } else {
        setAccountError("Account not found. Please check details.");
      }
    } catch (error) {
      setAccountError("Unable to verify account number.");
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Dynamic Multi-Currency Calculations
  const grossFiat = amount && exchangeRate ? parseFloat(amount) * exchangeRate : 0;
  const serviceFeeFiat = grossFiat ? (grossFiat * (serviceFeePercent / 100)) + flatFee : 0;
  const netPayoutFiat = Math.max(0, grossFiat - serviceFeeFiat);

// Use the active AppKit wallet provider instead of window.ethereum directly

  const handleOffRamp = async (e) => {
    e.preventDefault();
    if (!isConnected || !account) return alert("Please connect wallet!");
    if (!amount || !accountNumber || !accountName) {
      return alert("Please complete all verified fields!");
    }

    setLoading(true);
    setStatusMessage("1/3: Preparing transaction...");

    try {
      if (!walletProvider) {
        throw new Error("Wallet provider not connected. Please connect wallet.");
      }

      // 1. Initialize Web3 Provider & Signer from AppKit provider
      const provider = new ethers.BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      const parsedAmount = ethers.parseUnits(amount, 6);

      // 2. Step A: Approve Escrow Contract to spend tokens
      setStatusMessage("2/3: Please approve token spending in your wallet...");
      const tokenContract = new ethers.Contract(MOCK_TOKEN_ADDRESS, ERC20_ABI, signer);
      
      const approveTx = await tokenContract.approve(ESCROW_CONTRACT_ADDRESS, parsedAmount);
      setStatusMessage("Approval submitted... Waiting for block confirmation...");
      await approveTx.wait();

      // 3. Step B: Send/Deposit tokens to Escrow Contract
      setStatusMessage("3/3: Approval confirmed! Please confirm deposit transaction in your wallet...");
      
      const transferTx = await tokenContract.transfer(ESCROW_CONTRACT_ADDRESS, parsedAmount);
      setStatusMessage("Deposit transaction submitted... Confirming on-chain...");
      const receipt = await transferTx.wait();

      const realTxHash = receipt.hash;
      console.log("Confirmed On-Chain Tx Hash:", realTxHash);

      setStatusMessage("⛓️ Blockchain deposit confirmed! Triggering fiat payout...");

      // 4. Send real txHash to backend to execute off-ramp
      const response = await fetch(`${BACKEND_URL}/api/offramp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: account,
          amount: amount,
          targetCurrency: targetCurrency,
          bankDetails: { accountNumber, bankCode, accountName },
          txHash: realTxHash,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setStatusMessage(
          `🎉 Success! On-chain Tx: ${realTxHash.substring(0, 10)}... | Net payout of ${currencySymbol}${netPayoutFiat.toLocaleString()} ${targetCurrency} queued.`
        );
        setAmount("");
        setAccountNumber("");
        setAccountName("");
      } else {
        setStatusMessage("❌ Backend Payout Error: " + data.message);
      }
    } catch (error) {
      console.error("On-chain Transfer Error:", error);
      
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setStatusMessage("❌ Transaction rejected in wallet.");
      } else {
        setStatusMessage("❌ On-chain error: " + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Stablecoin Off-Ramp
        </h1>
        
        {/* Rate Display Header */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full border border-slate-600">
            1 {tokenSymbol} = <strong className="text-emerald-400">{currencySymbol}{exchangeRate.toLocaleString()} {targetCurrency}</strong>
          </span>
        </div>

        {/* AppKit Connect Wallet Button */}
        <div className="flex justify-center mb-6">
          <appkit-button />
        </div>

        <form onSubmit={handleOffRamp} className="space-y-4">
          {/* Crypto Asset + Target Currency Dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Pay With</label>
              <select 
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-blue-400 focus:outline-none"
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Receive In</label>
              <select 
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-emerald-400 focus:outline-none"
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="GHS">GHS (Ghanaian Cedi)</option>
                <option value="KES">KES (Kenyan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amount ({tokenSymbol})</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-lg font-semibold placeholder-slate-500"
            />
          </div>

          {/* Dynamic Fee & Payout Breakdown Card */}
          {amount > 0 && (
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Gross Value:</span>
                <span>{currencySymbol}{grossFiat.toLocaleString()} {targetCurrency}</span>
              </div>
              
              <div className="flex justify-between text-slate-400">
                <span>Service Fee ({serviceFeePercent}% + {currencySymbol}{flatFee}):</span>
                <span className="text-amber-400">-{currencySymbol}{serviceFeeFiat.toLocaleString()} {targetCurrency}</span>
              </div>

              <hr className="border-slate-800" />

              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-slate-200">Net Payout:</span>
                <span className="text-base font-bold text-emerald-400">
                  {currencySymbol}{netPayoutFiat.toLocaleString()} {targetCurrency}
                </span>
              </div>
            </div>
          )}

          {/* Bank Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Bank</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white"
            >
              <option value="044">Access Bank</option>
              <option value="058">GTBank</option>
              <option value="033">United Bank for Africa (UBA)</option>
              <option value="057">Zenith Bank</option>
              <option value="090110">VFD Microfinance Bank (OPay)</option>
              <option value="090267">Kuda Bank</option>
            </select>
          </div>

          {/* Account Number Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Account Number</label>
            <input
              type="text"
              maxLength={10}
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-500"
            />

            {isVerifyingAccount && (
              <p className="text-xs text-blue-400 mt-2 animate-pulse">
                🔍 Resolving account name...
              </p>
            )}

            {accountName && (
              <div className="mt-2 p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-400">Account Holder:</span>
                <span className="text-xs font-semibold text-emerald-400">{accountName}</span>
              </div>
            )}

            {accountError && (
              <p className="text-xs text-red-400 mt-2">
                ❌ {accountError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isConnected || !accountName || !amount}
            className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-semibold rounded-xl transition duration-200 shadow-lg"
          >
            {loading ? "Processing Off-Ramp..." : `Withdraw (${targetCurrency})`}
          </button>
        </form>

        {statusMessage && (
          <div className="mt-6 p-3 bg-slate-900 rounded-xl border border-slate-700 text-center text-xs text-slate-300">
            {statusMessage}
          </div>
        )}
      </div>
    </main>
  );
}