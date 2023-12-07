const crypto = require('crypto');
const axios = require('axios');
const secret = require('config/secret.js')
const FUTURES_API_URL = 'https://fapi.binance.com';
const FUTURES_API_URL_TEST = 'https://testnet.binancefuture.com';

const DEBUGGING = true; // Set this to false for production

const BINANCE_API_KEY = DEBUGGING ? 'your_test_api_key' : 'your_api_key';
const BINANCE_API_SECRET = DEBUGGING ? 'your_test_api_secret' : 'your_api_secret';

const API_KEY = DEBUGGING ? BINANCE_API_KEY_TEST : BINANCE_API_KEY;
const API_SECRET = DEBUGGING ? BINANCE_API_SECRET_TEST : BINANCE_API_SECRET;
const ORDER_URL = DEBUGGING ? `${FUTURES_API_URL_TEST}/fapi/v1/order` : `${FUTURES_API_URL}/fapi/v1/order`;

const headers = {
  'X-MBX-APIKEY': API_KEY,
};

const client = axios.create();

let WALLET_BALANCE = 0;

async function futures_change_leverage(symbol, leverage) {
  const url = `${FUTURES_API_URL}/fapi/v2/leverage`;
  const params = {
    symbol,
    leverage,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const response = await client.post(url, new URLSearchParams(params));
  return response.data;
}

async function futures_get_leverage(symbol) {
  const url = `${FUTURES_API_URL}/fapi/v2/account`;
  const params = {
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const response = await client.get(url, { params });
  const positions = response.data.positions;
  const position = positions.find((pos) => pos.symbol === symbol);
  return position ? position.leverage : 0;
}

async function GetAccountBalance() {
  const url = `${FUTURES_API_URL}/fapi/v2/account`;
  const params = {
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const response = await client.get(url, { params });
  const totalWalletBalance = parseFloat(response.data.totalWalletBalance);
  WALLET_BALANCE = totalWalletBalance;
  return totalWalletBalance;
}

async function futures_short_selling(symbol, quantity, stoploss = null, takeprofit = null, price = null) {
  const params = {
    symbol,
    side: 'SELL',
    positionSide: 'SHORT',
    type: 'MARKET',
    quantity,
    timestamp: Date.now(),
  };
  if (price) {
    params.type = 'LIMIT';
    params.price = price;
    params.timeinforce = 'GTC';
  }
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const order = await client.post(ORDER_URL, new URLSearchParams(params), { headers });
  const orderData = order.data;
  console.log(orderData);

  let profitOrder = { orderId: '' };
  let lossOrder = { orderId: '' };

  if (takeprofit) {
    const profitParams = {
      symbol,
      side: 'BUY',
      positionSide: 'SHORT',
      type: 'TAKE_PROFIT_MARKET',
      quantity,
      stopPrice: takeprofit,
      timestamp: Date.now(),
    };
    const profitSignature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(profitParams).toString()).digest('hex');
    profitParams.signature = profitSignature;
    const profitOrderResponse = await client.post(ORDER_URL, new URLSearchParams(profitParams), { headers });
    profitOrder = profitOrderResponse.data;
  }

  if (stoploss) {
    const lossParams = {
      symbol,
      side: 'BUY',
      positionSide: 'SHORT',
      type: 'STOP_MARKET',
      quantity,
      stopPrice: stoploss,
      timestamp: Date.now(),
    };
    const lossSignature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(lossParams).toString()).digest('hex');
    lossParams.signature = lossSignature;
    const lossOrderResponse = await client.post(ORDER_URL, new URLSearchParams(lossParams), { headers });
    lossOrder = lossOrderResponse.data;
  }

  return [orderData, profitOrder, lossOrder];
}

async function futures_short_buying(symbol, quantity = null) {
  const params = {
    symbol,
    side: 'BUY',
    positionSide: 'SHORT',
    type: 'MARKET',
    quantity,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const order = await client.post(ORDER_URL, new URLSearchParams(params), { headers });
  console.log(order.data);
  return order.data;
}

async function futures_long_buying(symbol, quantity, stoploss = null, takeprofit = null, price = null) {
  const params = {
    symbol,
    side: 'BUY',
    positionSide: 'LONG',
    type: 'MARKET',
    quantity,
    timestamp: Date.now(),
  };
  if (price) {
    params.type = 'LIMIT';
    params.price = price;
    params.timeinforce = 'GTC';
  }
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const order = await client.post(ORDER_URL, new URLSearchParams(params), { headers });
  const orderData = order.data;
  console.log(orderData);

  let profitOrder = { orderId: '' };
  let lossOrder = { orderId: '' };

  if (takeprofit) {
    const profitParams = {
      symbol,
      side: 'SELL',
      positionSide: 'LONG',
      type: 'TAKE_PROFIT_MARKET',
      quantity,
      stopPrice: takeprofit,
      timestamp: Date.now(),
    };
    const profitSignature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(profitParams).toString()).digest('hex');
    profitParams.signature = profitSignature;
    const profitOrderResponse = await client.post(ORDER_URL, new URLSearchParams(profitParams), { headers });
    profitOrder = profitOrderResponse.data;
  }

  if (stoploss) {
    const lossParams = {
      symbol,
      side: 'SELL',
      positionSide: 'LONG',
      type: 'STOP_MARKET',
      quantity,
      stopPrice: stoploss,
      timestamp: Date.now(),
    };
    const lossSignature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(lossParams).toString()).digest('hex');
    lossParams.signature = lossSignature;
    const lossOrderResponse = await client.post(ORDER_URL, new URLSearchParams(lossParams), { headers });
    lossOrder = lossOrderResponse.data;
  }

  return [orderData, profitOrder, lossOrder];
}

async function futures_long_selling(symbol, quantity = null) {
  const params = {
    symbol,
    side: 'SELL',
    positionSide: 'LONG',
    type: 'MARKET',
    quantity,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const order = await client.post(ORDER_URL, new URLSearchParams(params), { headers });
  console.log(order.data);
  return order.data;
}

async function futures_cancel_all_open_orders(symbol) {
  const url = `${FUTURES_API_URL}/fapi/v1/allOpenOrders`;
  const params = {
    symbol,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const order = await client.delete(url, { params, headers });
  console.log(params, order.data);
  return order.data;
}

function futures_profit_calculator(percent, start, end) {
  if ((!percent && (!start || !end)) || (percent && start && end)) {
    throw new Error("Either percent or both start and end are required");
  }
  if (start && end) {
    percent = (end / start) * 100 - 100;
  }
  return 0.009998 * percent + 0.9994;
}

function futures_stop_calculator(percent, price) {
  return (price * (100 + percent)) / 100;
}

async function futures_get_quantity_precision(symbol) {
  const response = await client.get(`${FUTURES_API_URL}/fapi/v1/exchangeInfo`);
  const exchangeInfo = response.data;
  if (typeof symbol === 'string' && symbol !== '*') {
    const asset = exchangeInfo.symbols.find((asset) => asset.symbol === symbol);
    return asset ? asset.quantityPrecision : null;
  } else {
    const precisionMap = {};
    for (const asset of exchangeInfo.symbols) {
      if (symbol === '*' || symbol.includes(asset.symbol)) {
        precisionMap[asset.symbol] = asset.quantityPrecision;
      }
    }
    return precisionMap;
  }
}

async function futures_get_price_precision(symbol) {
  const response = await client.get(`${FUTURES_API_URL}/fapi/v1/exchangeInfo`);
  const exchangeInfo = response.data;
  if (typeof symbol === 'string' && symbol !== '*') {
    const asset = exchangeInfo.symbols.find((asset) => asset.symbol === symbol);
    return asset ? asset.pricePrecision : null;
  } else {
    const precisionMap = {};
    for (const asset of exchangeInfo.symbols) {
      if (symbol === '*' || symbol.includes(asset.symbol)) {
        precisionMap[asset.symbol] = asset.pricePrecision;
      }
    }
    return precisionMap;
  }
}

async function futures_change_margin_type(symbol, marginType) {
  const url = `${FUTURES_API_URL}/fapi/v1/marginType`;
  const params = {
    symbol,
    marginType,
    timestamp: Date.now(),
  };
  const signature = crypto.createHmac('sha256', API_SECRET).update(new URLSearchParams(params).toString()).digest('hex');
  params.signature = signature;
  const response = await client.post(url, new URLSearchParams(params));
  return response.data;
}
