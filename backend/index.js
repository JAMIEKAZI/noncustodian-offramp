import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getContractDetails } from "./contractService.js";
import { triggerFiatPayout, verifyBankAccount, getExchangeRate } from "./roqquService.js";

require("dotenv").config();
const express = require('express');

app.use(cors());
app.use(express.json()); 

const port = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors({
  origin: ['https://rampme.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.get("/", (req, res) => {
  res.send("🚀 Stablecoin Off-Ramp API Backend is Live!");
});

app.get("/api/contract-info", async (req, res) => {
  try {
    const details = await getContractDetails();
    res.json({ status: "success", data: details });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// GET EXCHANGE RATE WITH TARGET CURRENCY QUERY
app.get("/api/rate", async (req, res) => {
  try {
    const symbol = req.query.symbol || "usdt";
    const currency = req.query.currency || "NGN";
    const rateData = await getExchangeRate(symbol, currency);
    res.json({ status: "success", data: rateData });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/verify-account", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  try {
    const result = await verifyBankAccount(accountNumber, bankCode);
    res.json({ status: "success", data: result });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/offramp", async (req, res) => {
  const { userAddress, amount, bankDetails, txHash } = req.body;
  try {
    const payoutResult = await triggerFiatPayout(amount, bankDetails);
    res.json({
      status: "success",
      message: "Off-ramp transaction successful!",
      data: payoutResult,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});