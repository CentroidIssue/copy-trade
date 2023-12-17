const crypto = require('crypto');
const axios = require('axios');
const secret = require('./config/secret.json')
const public = require('./config/public.json');
const { builtinModules } = require('module');
const FUTURES_API_URL = 'https://api.bybit.com/unified/v3/private';
const FUTURES_API_URL_TEST = 'https://api-testnet.bybit.com/unified/v3/private';

public.DEBUGGING = false; // Set this to false for production

const API_KEY = public.DEBUGGING ? secret.BYBIT_API_KEY_TEST : secret.BYBIT_API_KEY;
const API_SECRET = public.DEBUGGING ? secret.BYBIT_API_SECRET_TEST : secret.BYBIT_API_SECRET;
const ORDER_URL = public.DEBUGGING ? `${FUTURES_API_URL_TEST}/order/create` : `${FUTURES_API_URL}/order/create`;

const headers = { 
    'X-BAPI-SIGN-TYPE': '2', 
    'X-BAPI-SIGN': '', 
    'X-BAPI-API-KEY': API_KEY, 
    'X-BAPI-TIMESTAMP': '', 
    'Content-Type': 'application/json'
};
/**
 * 
 * All parameters are string
 * @param {*} symbol 
 * @param {*} quantity 
 * @param {*} stoploss 
 * @param {*} takeprofit 
 * @param {*} price 
 */
async function futures_long_buying(symbol, quantity, stoploss = null, takeprofit = null, price = null) {
    if (public.ALERT_ONLY){
      return;
    }
    let data_json = {
        "symbol": symbol,
        "orderType": "Market",
        "side": "Buy",
        "qty": quantity,
        "timeInForce": "GoodTillCancel",
        "category": "linear",
        "positionIdx": "1",
        "stopLoss": stoploss,
        "takeProfit": takeprofit
    };
    if (price != null) {
        data_json['price'] = price;
        data_json['orderType'] = "Limit";
    }
    let data = JSON.stringify(data_json);
    headers['X-BAPI-TIMESTAMP'] = Date.now();
    // # rule:
    // timestamp+api_key+recv_window+raw_request_body
    hashstring = headers['X-BAPI-TIMESTAMP'] + API_KEY + data;
    headers['X-BAPI-SIGN'] = crypto.createHmac('sha256', API_SECRET).update(hashstring).digest('hex');
    let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.bybit.com/unified/v3/private/order/create',
    headers: headers,
    data : data
    };
    axios.request(config)
    .then((response) => {
    console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
    console.log(error);
    });
}
/**
 * All parameters are string
 * @param {*} symbol 
 * @param {*} quantity 
 */
async function futures_long_selling(symbol, quantity){
    if (public.ALERT_ONLY){
        return;
    }
    let data_json = {
        "symbol": symbol,
        "orderType": "Market",
        "side": "Sell",
        "qty": quantity,
        "timeInForce": "GoodTillCancel",
        "category": "linear",
        "positionIdx": "1"
    };
    let data = JSON.stringify(data_json);
    headers['X-BAPI-TIMESTAMP'] = Date.now();
    // # rule:
    // timestamp+api_key+recv_window+raw_request_body
    hashstring = headers['X-BAPI-TIMESTAMP'] + API_KEY + data;
    headers['X-BAPI-SIGN'] = crypto.createHmac('sha256', API_SECRET).update(hashstring).digest('hex');
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.bybit.com/unified/v3/private/order/create',
        headers: headers,
        data : data
    };
    axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });
}

/**
 * All parameters are string
 * @param {*} symbol
 * @param {*} quantity
 * @param {*} stoploss
 * @param {*} takeprofit
 * @param {*} price
 */
async function futures_short_selling(symbol, quantity, stoploss = null, takeprofit = null, price = null) {
    if (public.ALERT_ONLY){
      return;
    }
    console.log(quantity);
    let data_json = {
        "symbol": symbol,
        "orderType": "Market",
        "side": "Sell",
        "qty": quantity,
        "timeInForce": "GoodTillCancel",
        "category": "linear",
        "positionIdx": "2",
        "stopLoss": stoploss,
        "takeProfit": takeprofit
    };
    if (price != null) {
        data_json['price'] = price;
        data_json['orderType'] = "Limit";
    }
    let data = JSON.stringify(data_json);
    headers['X-BAPI-TIMESTAMP'] = Date.now();
    // # rule:
    // timestamp+api_key+recv_window+raw_request_body
    hashstring = headers['X-BAPI-TIMESTAMP'] + API_KEY + data;
    headers['X-BAPI-SIGN'] = crypto.createHmac('sha256', API_SECRET).update(hashstring).digest('hex');
    let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.bybit.com/unified/v3/private/order/create',
    headers: headers,
    data : data
    };
    axios.request(config)
    .then((response) => {
    console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
    console.log(error);
    });
}

/**
 * All parameters are string
 * @param {*} symbol 
 * @param {*} quantity
 */
async function futures_short_buying(symbol, quantity){
    if (public.ALERT_ONLY){
        return;
    }
    let data_json = {
        "symbol": symbol,
        "orderType": "Market",
        "side": "Buy",
        "qty": quantity,
        "timeInForce": "GoodTillCancel",
        "category": "linear",
        "positionIdx": "2"
    };
    let data = JSON.stringify(data_json);
    headers['X-BAPI-TIMESTAMP'] = Date.now();
    // # rule:
    // timestamp+api_key+recv_window+raw_request_body
    hashstring = headers['X-BAPI-TIMESTAMP'] + API_KEY + data;
    headers['X-BAPI-SIGN'] = crypto.createHmac('sha256', API_SECRET).update(hashstring).digest('hex');
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.bybit.com/unified/v3/private/order/create',
        headers: headers,
        data : data
    };
    axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });
}

module.exports = {
    futures_long_buying,
    futures_long_selling,
    futures_short_buying,
    futures_short_selling
}

