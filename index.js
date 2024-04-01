const express = require('express');
const copytrade = require('./binance.js');
const app = express();
const port = 10000;

app.get('/', async (req, res) => {
    time = new Date();
    console.log("GET /" + time);
    try {
        copytrade.exec();
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
});