const express = require('express');
const axios = require('axios');
const path = require('path');
const morgan = require('morgan'); // Import morgan for logging
const rateLimit = require('express-rate-limit'); // Import rate-limiting middleware
const helmet = require('helmet'); // Import helmet for security headers
require('./src/cronJob');
const { Address, Transaction, EthereumPrice } = require('./src/database');

const app = express();
app.use(express.json());
app.use(helmet()); // Use helmet middleware for security headers

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter); // Apply rate limiting middleware

// Configure logging
app.use(morgan('combined')); // Use morgan for logging

const etherscanApiKey = process.env.ETHERSCAN_API_KEY; // Use environment variable
const etherscanApiUrl = 'https://api.etherscan.io/api';

// Set up error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error with stack trace
  res.status(500).json({ error: 'Something went wrong' });
});

app.get('/', (req, res) => {
  res.send("Welcome to the Ethereum Price Tracker API!");
});

app.get('/ethereum-price', async (req, res, next) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
    const ethereumPrice = response.data.ethereum.inr;

    // Store the Ethereum price in the database
    const ethereumPriceDoc = new EthereumPrice({ price: ethereumPrice });
    await ethereumPriceDoc.save();
    console.log(`${new Date().toLocaleTimeString()} Minutes Ethereum price : ${ethereumPrice}`);

    res.json({ price: ethereumPrice });
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

app.get('/balance/:address', async (req, res, next) => {
  try {
    const address = req.params.address;

    // Check if address exists in database
    const existingAddress = await Address.findOne({ address }).exec();
    if (!existingAddress) {
      res.json({
        address,
        reason: 'Address not found in the database',
      });
      return;
    }
    // Fetch all transactions for the user
    const userTransactions = await Transaction.find({ $or: [{ from: address }, { to: address }] });

    // Calculate balance
    let balance = 0;
    userTransactions.forEach((transaction) => {
      if (transaction.to === address) {
        balance += parseInt(transaction.value);
      } else if (transaction.from === address) {
        balance -= parseInt(transaction.value);
      }
    });

    // Fetch Ethereum price
    const ethereumPrice = await EthereumPrice.findOne().sort({ _id: -1 }).exec();

    res.json({
      address,
      balance,
      ethereumPrice: ethereumPrice.price,
    });
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

app.post('/transactions/:address', async (req, res, next) => {
  try {
    const address = req.params.address;
    const response = await axios.get(`${etherscanApiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=WGBI7DXBISQZJFBH4AMAQP4G58Q8U9PJMJ`);
    const transactions = response.data.result;

    // Store transactions in database
    let addressDoc = await Address.findOne({ address });
    if (!addressDoc) {
      addressDoc = new Address({ address, transactions: [] });
    }
    addressDoc.transactions = [];
    transactions.forEach(async (transaction) => {
      const transactionDoc = new Transaction(transaction);
      addressDoc.transactions.push(transactionDoc);
      await transactionDoc.save();
    });
    await addressDoc.save();

    res.json(transactions);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

const PORT = process.env.PORT || 3000; // Use environment variable or fallback to 3000
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;