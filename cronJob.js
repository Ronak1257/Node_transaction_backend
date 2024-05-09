const cron = require('node-cron');
const axios = require('axios');
const { EthereumPrice } = require('./database');

cron.schedule('*/10 * * * *', async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
    const ethereumPrice = response.data.ethereum.inr;

    // Store the Ethereum price in the database
    const ethereumPriceDoc = new EthereumPrice({ price: ethereumPrice });
    await ethereumPriceDoc.save();

    console.log(`${new Date().toLocaleTimeString()} Minutes Ethereum price : ${ethereumPrice}`);
  } catch (error) {
    console.error(error);
  }
});