const express = require('express');
const axios = require('axios');
require('./cronJob');
const { Address, Transaction,EthereumPrice } = require('./database');

const app = express();

const etherscanApiKey = 'WGBI7DXBISQZJFBH4AMAQP4G58Q8U9PJMJ';
const etherscanApiUrl = 'https://api.etherscan.io/api';

app.get('/',  (req, res) => {
    res.send('Welcome to the Ethereum price and transaction API!');
})

app.get('/ethereum-price', async (req, res) => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
        const ethereumPrice = response.data.ethereum.inr;

        // Store the Ethereum price in the database
        const ethereumPriceDoc = new EthereumPrice({ price: ethereumPrice });
        await ethereumPriceDoc.save();
        console.log(`${new Date().toLocaleTimeString()} Minutes Ethereum price : ${ethereumPrice}`); 

        res.json({ price: ethereumPrice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch Ethereum price' });
    }
});

app.get('/balance/:address', async (req, res) => {
    try {
      const address = req.params.address;
  
      // Check if address exists in database
      const existingAddress = await Address.findOne({ address }).exec();
      if (!existingAddress) {
        res.json({
          address,
          reason: 'Address not found in the database'
        });
        return;
      }
      // Fetch all transactions for the user
      const userTransactions = await Transaction.find({ $or: [{ from: address }, { to: address }] });
  
      // Calculate balance
      let balance = 0;
      userTransactions.forEach(transaction => {
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
        ethereumPrice: ethereumPrice.price
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

app.get('/transactions/:address', async (req, res) => {
    try {
      const address = req.params.address;
      const response = await axios.get(`${etherscanApiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`);
      const transactions = response.data.result;
  
      // Store transactions in database
      let addressDoc = await Address.findOne({ address });
      if (!addressDoc) {
        addressDoc = new Address({ address, transactions: [] });
      }
      addressDoc.transactions = [];
      transactions.forEach(async(transaction) => {
        const transactionDoc = new Transaction(transaction);
        addressDoc.transactions.push(transactionDoc);
        await transactionDoc.save();
      });
      await addressDoc.save();
  
      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});