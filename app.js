const express = require('express');
const axios = require('axios');
const { Address, Transaction } = require('./database');

const app = express();
app.use(express.json());

const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const etherscanApiUrl = 'https://api.etherscan.io/api';

app.get('/',  (req, res) => {
    res.send('Welcome to the Ethereum price and transaction API!');
})

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