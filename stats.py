import numpy
import httpx
import json
import pandas as pd
from typing import Union, Optional, Literal
import asyncio
import zipfile, os, io, datetime
from decimal import Decimal, getcontext 
getcontext().prec = 6

client = httpx.AsyncClient()
# Import json config file
with open('config/public.json') as file:
    PUBLIC = json.load(file)

with open('config/secret.json') as file:
    SECRET = json.load(file)

class TEvent:
    def __init__(self, timestamp: int, data: any):
        self.timestamp = timestamp
        self.data = data
    def __str__(self):
        return f'{self.timestamp}: {self.data}'
    def __repr__(self):
        return f'{self.timestamp}: {self.data}'
    def __eq__(self, other):
        return self.timestamp == other.timestamp and self.data == other.data
    def __lt__(self, other):
        return self.timestamp < other.timestamp
    def __gt__(self, other):
        return self.timestamp > other.timestamp
    def __le__(self, other):
        return self.timestamp <= other.timestamp
    def __ge__(self, other):
        return self.timestamp >= other.timestamp
    def __ne__(self, other):
        return self.timestamp != other.timestamp or self.data != other.data

# Get the leader trade history
async def get_bybit_trade_history(LEADER_MARK: Union[str, int], page: int = 0) -> json:
    # Return a list of trades of a leader. Return all trade if page = 0
    pass

# Get the leader trade history
async def get_binance_trade_history(PORTFOLIO_ID: Union[str, int], page: int = 0) -> json:
    """Return a list of trades of a leader. Return all trade if page = 0"""
    url = "https://www.binance.com/bapi/futures/v1/public/future/copy-trade/lead-portfolio/trade-history"
    data = {
        "pageNumber": page,
        "pageSize": 1000,
        "portfolioId": PORTFOLIO_ID
    }
    if page:
        response = await client.post(url, json=data)
    else:
        tasks = []
        for page in range(1, 100):
            data = {
                "pageNumber": page,
                "pageSize": 1000,
                "portfolioId": PORTFOLIO_ID
            }
            tasks.append(asyncio.create_task(client.post(url, json=data)))
            asyncio.gather(*tasks)
        responses = []
        for task in tasks:
            responses.append(await task)
        ret = []
        for response in responses:
            response = response.json()
            ret += response['data']['list']
        # Return the list of trades
        return ret

# Get klines of a symbol
async def get_klines(symbol: str, 
             date: str, 
             func: Literal["klines", "markPriceKlines", "premiumIndexKlines", "indexPriceKlines"]
             ) -> pd.DataFrame:
    """download content from a url, unzip, and save to a csv file"""
    # If the date today, use the official api
    if date == datetime.datetime.now().strftime('%Y-%m-%d'):
        url = f'https://fapi.binance.com/fapi/v1/{func}'
        params = {
            'symbol': symbol,
            'limit': 1500,
            'interval': '1m'
        }
        response = await client.get(url, params = params)
        try:
            # Response is a 2 dimensional array
            # Convert to dataframe with title: open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore
            df = pd.DataFrame(response.json(), columns=['open_time','open','high','low','close','volume','close_time','quote_volume','count','taker_buy_volume','taker_buy_quote_volume','ignore'])
            return df
        except:
            print(f'Error: {url}')
            df = pd.DataFrame()
        # Filter the data 
        return df
    url = f'https://data.binance.vision/data/futures/um/daily/{func}/{symbol}/1m/' + symbol + '-1m-' + date + '.zip'
    r = await client.get(url)
    try:
        z = zipfile.ZipFile(io.BytesIO(r.content))        
        z.extractall(f'data/{func}/')
        df = pd.read_csv(f'data/{func}/' + symbol + '-1m-' + date + '.csv')
        df.to_csv(f'data/{func}/' + symbol + '-1m-' + date + '.csv')
        # Delete the csv file
        os.remove(f'data/{func}/' + symbol + '-1m-' + date + '.csv')
    except:
        print(f'Error: {url}')
        df = pd.DataFrame()
    return df

async def get_data(symbol: str, date: str) -> tuple:
    res = await get_klines(symbol, date, 'klines')
    return (symbol, res)
    

# Analyse MDD:
async def mdd(trades: list) -> float:
    """Return the MDD of a list of trades"""
    # Reverse the list of trades
    trades.reverse()
    if (len(trades) == 0):
        return 0
    total_profit = 0
    for i, trade in enumerate(trades):
        total_profit += trade['realizedProfit'] + trade['fee']
    position = {}
    # {
        # 'time': 1702042753000, 
        # 'symbol': 'BTCUSDT', 
        # 'side': 'BUY', 
        # 'price': 43540.2, 
        # 'fee': -0.9796545, 
        # 'feeAsset': 'USDT', 
        # 'quantity': 1959.309, 
        # 'quantityAsset': 'USDT', 
        # 'realizedProfit': 0.0, 
        # 'realizedProfitAsset': 'USDT', 
        # 'baseAsset': 'BTC', 
        # 'qty': 0.045, 
        # 'positionSide': 'BOTH', 
        # 'activeBuy': True
    # }
    required_intervals = []
    for i, trade in enumerate(trades):
        timestamp = trade['time'] // 86400000 * 86400000
        if not position.get(trade['symbol']):
            position[trade['symbol']] = {
                'qty': 0,
                'start': timestamp
            }
        if trade['side'] == 'BUY':
            position[trade['symbol']]['qty'] += Decimal(str(trade['qty']))
        else:
            position[trade['symbol']]['qty'] -= Decimal(str(trade['qty']))
        if position[trade['symbol']]['qty'] == 0:
            required_intervals.append((trade['symbol'], position[trade['symbol']]['start'], timestamp))
            position.pop(trade['symbol'])
    for symbol in position:
        required_intervals.append((symbol, position[symbol]['start'], timestamp))
    tasks = []
    for interval in required_intervals:
        for i in range(interval[1], interval[2] + 86400000, 86400000):
            # Convert i to datetime
            date = datetime.datetime.fromtimestamp(i / 1000)
            # Convert i to string, formatting yyyy-mm-dd
            date = date.strftime('%Y-%m-%d')
            tasks.append(asyncio.create_task(get_data(interval[0], date)))
    # Wait for all tasks to finish
    responses = await asyncio.gather(*tasks)
    data = {
        
    }
    # data = {
    #     'BTCUSDT': {
    #         '1702042753000' : dataframe
    #     }
    # }
    for response in responses:
        symbol = str(response[0])
        df = pd.DataFrame(response[1])
        # For each row in dataframe
        for i in range(len(df)):
            # Convert open_time to string
            timestamp = int(df.iloc[i]['open_time'])
            if not data.get(symbol):
                data[symbol] = {}
            data[symbol][timestamp] = df.iloc[i]
    
    # Get the first timestamp of the trade
    low = 0
    first = trades[0]['time']
    last = trades[-1]['time']
    first = first // 86400000 * 86400000
    cur = 0
    position = {}
    RealizedPnL = 0
    UnRealizedPnL = 0
    for i in range(first, last + 60000, 60000):
        print(cur, trades[cur]['time'], i)
        while (cur < len(trades) and trades[cur]['time'] // 60000 * 60000 <= i):
            if not position.get(trades[cur]['symbol']):
                position[trades[cur]['symbol']] = {
                    'qty': 0,
                    'cap': 0,
                    'start': timestamp
                }
            if trades[cur]['side'] == 'BUY':
                position[trades[cur]['symbol']]['qty'] += Decimal(str(trades[cur]['qty']))
                position[trades[cur]['symbol']]['cap'] += Decimal(str(trades[cur]['qty'])) * Decimal(str(trades[cur]['price']))
            else:
                position[trades[cur]['symbol']]['qty'] -= Decimal(str(trades[cur]['qty']))
                position[trades[cur]['symbol']]['cap'] -= Decimal(str(trades[cur]['qty'])) * Decimal(str(trades[cur]['price']))
            RealizedPnL += trades[cur]['realizedProfit'] + trades[cur]['fee']
            cur += 1
        UnRealizedPnL = 0
        if cur < len(trades):
            for symbol in position:
                UnRealizedPnL += position[symbol]['cap'] - Decimal(float(data[symbol][i]['low'])) * Decimal(position[symbol]['qty'])
            print(round(UnRealizedPnL, 2), i, position)
        low = min(low, float(UnRealizedPnL))
    return low

async def main():
    data = await get_binance_trade_history(PUBLIC['PROFILE_ID'][0]['ID'])
    await mdd(data)
if __name__ == '__main__':
    asyncio.run(main())
    pass