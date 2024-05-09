const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.get('/',  (req, res) => {
    res.send('Welcome to the Ethereum price and transaction API!');
})

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});