import dotenv from "dotenv";
dotenv.config();

// Supported target fiat currencies and mock rates
const FIAT_RATES = {
  NGN: { symbol: "₦", rate: 1450.0, serviceFeePercent: 1.5, flatFee: 100 },
  GHS: { symbol: "GH₵", rate: 15.2, serviceFeePercent: 1.5, flatFee: 5 },
  KES: { symbol: "KSh", rate: 130.0, serviceFeePercent: 1.5, flatFee: 50 },
  USD: { symbol: "$", rate: 1.0, serviceFeePercent: 1.0, flatFee: 1 },
  EUR: { symbol: "€", rate: 0.92, serviceFeePercent: 1.0, flatFee: 1 },
};

// Fetch exchange rate based on token and selected payout currency
export const getExchangeRate = async (symbol = "usdt", targetCurrency = "NGN") => {
  try {
    const currencyData = FIAT_RATES[targetCurrency.toUpperCase()] || FIAT_RATES.NGN;

    return {
      tokenSymbol: symbol.toUpperCase(),
      currency: targetCurrency.toUpperCase(),
      currencySymbol: currencyData.symbol,
      rate: currencyData.rate,
      serviceFeePercent: currencyData.serviceFeePercent,
      flatFee: currencyData.flatFee,
    };
  } catch (error) {
    console.error("Exchange Rate Error:", error);
    throw new Error("Could not fetch conversion rate.");
  }
};

export const verifyBankAccount = async (accountNumber, bankCode) => {
  if (!accountNumber || accountNumber.length !== 10) {
    throw new Error("Invalid account number length.");
  }

  try {
    return {
      accountName: "JAMES POWEL",
      accountNumber,
      bankCode,
    };
  } catch (error) {
    console.error("Account Verification Error:", error);
    throw new Error("Could not resolve bank account details.");
  }
};

export const triggerFiatPayout = async (amount, bankDetails) => {
  console.log(`Initiating payout of $${amount} to bank account: ${bankDetails.accountNumber}...`);
  
  try {
    return {
      status: "success",
      transactionId: `RQ-${Math.floor(Math.random() * 1000000)}`,
      message: "Fiat payout successfully queued.",
    };
  } catch (error) {
    console.error("Roqqu API Error:", error);
    throw new Error("Failed to process fiat payout.");
  }
};