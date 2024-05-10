require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://ronak:ronak@cluster0.1jls2ie.mongodb.net/"), { useNewUrlParser: true, useUnifiedTopology: true };

const db = mongoose.connection;

db.on('error', (error) => {
  console.error(error);
});

db.once('open', () => {
  console.log('Connected to MongoDB');
});

const transactionSchema = new mongoose.Schema({
  address: String,
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]
});

const ethereumPriceSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', {
  blockNumber: Number,
  timeStamp: Number,
  hash: String,
  nonce: Number,
  blockHash: String,
  from: String,
  contractAddress: String,
  to: String,
  value: String,
  tokenName: String,
  tokenSymbol: String,
  transactionIndex: Number,
  gas: Number,
  gasPrice: Number,
  gasUsed: Number,
  cumulativeGasUsed: Number,
  input: String,
  confirmations: Number
});

const Address = mongoose.model('Address', transactionSchema);

const EthereumPrice = mongoose.model('EthereumPrice', ethereumPriceSchema);

module.exports = { Address, Transaction, EthereumPrice };