const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const futures = require('./bybit_futures.js');
const public = require('./config/public.json');
const noti = require('./noti.js')
const fs = require('fs');
const { exit } = require('process');
const { table, timeLog } = require('console');
const { stringify } = require('querystring');

//create file bybit.db if not exist
fs.writeFile('database/bybit.db', '', function (err) {
    if (err) return console.log(err);
});
const db = new sqlite3.Database('database/bybit.db');

console.log("Opened database successfully");

async function get_bybit_position(leaderMark) {
    const url = public.BYBIT_LEADER_POSITION_API + "leaderMark=" + leaderMark;
    //headers with cookie empty
    const headers = {
        'cookie': '',
    };
    const response = await axios.get(url, { headers: headers });
    return response.data.result;
}

async function init() {
    noti.messengerBotSendText(public.USER_ID[0], "Bybit background job is starting");
    //get all data for all public.LEADER_MARK using axios asynchronously
    const promises = public.LEADER_MARK.map(async (id) => {
        return await get_bybit_position(id.ID);
    });
    //wait for all promises to be resolved
    const responses = await Promise.all(promises);
    //store all responses in response.data
    responses.data = responses.map((response) => response.data);
    //write response to database
    db.serialize(() => {
        //table name is public.LEADER_MARK[].ID
        public.LEADER_MARK.forEach((id) => {
            //Create table if not exist
            db.run(`CREATE TABLE IF NOT EXISTS '${id.ID}' (symbol TEXT, entryPrice TEXT, sizeX TEXT, createdAtE3 TEXT, side TEXT, leverageE2 TEXT, isIsolated TEXT, transactTimeE3 TEXT, stopLossPrice TEXT, takeProfitPrice TEXT, takeProfitOrderId TEXT, stopLossOrderId TEXT, orderCostE8 TEXT, reCalcEntryPrice TEXT, positionEntryPrice TEXT, positionCycleVersion TEXT, crossSeq TEXT, closeFreeQtyX TEXT, minPositionCostE8 TEXT, positionBalanceE8 TEXT)`);
            //Delete all data in table
            db.run(`DELETE FROM '${id.ID}'`);
            //Insert data to table
            responses.data[public.LEADER_MARK.indexOf(id)].forEach((position) => {
                db.run(`INSERT INTO '${id.ID}' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['symbol'], position['entryPrice'], position['sizeX'], position['createdAtE3'], position['side'], position['leverageE2'], position['isIsolated'], position['transactTimeE3'], position['stopLossPrice'], position['takeProfitPrice'], position['takeProfitOrderId'], position['stopLossOrderId'], position['orderCostE8'], position['reCalcEntryPrice'], position['positionEntryPrice'], position['positionCycleVersion'], position['crossSeq'], position['closeFreeQtyX'], position['minPositionCostE8'], position['positionBalanceE8']]);
            });

        });

    });
}

/**
 * Serialize message to string
 * @param {json} message
 */
function serialize_message(message) {
    let serialized_message = "";
    for (const [key, value] of Object.entries(message)) {
        serialized_message += `${key}: ${value}\n`;
    }
    return serialized_message;
}

async function run() {
    try {
        while (true) {
            //get all data for all public.LEADER_MARK using axios asynchronously
            const promises = public.LEADER_MARK.map(async (id) => {
                return await get_bybit_position(id.ID);
            });
            //wait for all promises to be resolved
            const responses = await Promise.all(promises);
            console.log(responses);
            //store all responses in response.data
            responses.data = responses.map((response) => response.data);
            //For all public.LEADER_MARK and write data to ID.json
            public.LEADER_MARK.forEach((id) => {
                fs.writeFile('database/' + id.ID + '.json', JSON.stringify(responses.data[public.LEADER_MARK.indexOf(id)], null, 2), function (err) {
                    if (err) return console.log(err);
                });
            });
            //For all public.LEADER_MARK and compare data with database
            public.LEADER_MARK.forEach(async (id) => {
                const data = responses.data[public.LEADER_MARK.indexOf(id)];
                //compare data with database
                data.forEach((position) => {
                    //if position is not in database
                    db.get(`SELECT * FROM '${id.ID}' WHERE symbol=? AND side=?`, [position['symbol'], position['side']], (err, row) => {
                        if (err) {
                            console.error(err.message);
                        }
                        if (!row){
                            //insert position to database
                            db.run(`INSERT INTO '${id.ID}' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['symbol'], position['entryPrice'], position['sizeX'], position['createdAtE3'], position['side'], position['leverageE2'], position['isIsolated'], position['transactTimeE3'], position['stopLossPrice'], position['takeProfitPrice'], position['takeProfitOrderId'], position['stopLossOrderId'], position['orderCostE8'], position['reCalcEntryPrice'], position['positionEntryPrice'], position['positionCycleVersion'], position['crossSeq'], position['closeFreeQtyX'], position['minPositionCostE8'], position['positionBalanceE8']]);
                            //CConvert quantity to int then divide quantity by 1e8
                            let quantity = parseFloat(position['sizeX']) / 1e8;
                            quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                            decimal = futures.function_get_decimal(position['symbol']);
                            quantity = quantity.toFixed(decimal);
                            console.log(quantity, position['sizeX'], 0);
                            if (position['side'] == "Buy") {
                                futures.futures_long_buying(position['symbol'], (quantity).toString());
                            }
                            else{
                                futures.futures_short_selling(position['symbol'], (quantity).toString());
                            }
                            noti.messengerBotSendText(public.USER_ID[0], serialize_message(position));
                        }
                        //if position is in database
                        else {
                            //if position is not equal to row
                            if (position.sizeX != row.sizeX) {
                                //update position in database
                                db.run(`UPDATE '${id.ID}' SET 
                                entryPrice = ?, 
                                sizeX = ?, 
                                createdAtE3 = ?, 
                                leverageE2 = ?, 
                                isIsolated = ?, 
                                transactTimeE3 = ?, 
                                stopLossPrice = ?, 
                                takeProfitPrice = ?, 
                                takeProfitOrderId = ?, 
                                stopLossOrderId = ?, 
                                orderCostE8 = ?, 
                                reCalcEntryPrice = ?, 
                                positionEntryPrice = ?, 
                                positionCycleVersion = ?, 
                                crossSeq = ?, 
                                closeFreeQtyX = ?, 
                                minPositionCostE8 = ?, 
                                positionBalanceE8 = ? 
                                WHERE symbol = ? AND side = ?`, [position['entryPrice'], position['sizeX'], position['createdAtE3'], position['leverageE2'], position['isIsolated'], position['transactTimeE3'], position['stopLossPrice'], position['takeProfitPrice'], position['takeProfitOrderId'], position['stopLossOrderId'], position['orderCostE8'], position['reCalcEntryPrice'], position['positionEntryPrice'], position['positionCycleVersion'], position['crossSeq'], position['closeFreeQtyX'], position['minPositionCostE8'], position['positionBalanceE8'], position['symbol'], position['side']]);
                                //CConvert quantity to int then divide quantity by 1e8
                                let quantity = parseInt(position['sizeX']) / 1e8;
                                quantity = quantity - parseInt(row.sizeX) / 1e8;
                                quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                decimal = futures.function_get_decimal(position['symbol']);
                                quantity = quantity.toFixed(decimal);
                                console.log(quantity, position['sizeX'], row.sizeX);
                                if (quantity > 0){
                                    if (position['side'] == "Buy") {
                                        futures.futures_long_buying(position['symbol'], (quantity).toString());
                                    }
                                    else{
                                        futures.futures_short_selling(position['symbol'], (quantity).toString());
                                    }
                                    noti.messengerBotSendText(public.USER_ID[0], serialize_message(position));
                                }
                                else{
                                    quantity = -quantity;
                                    quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                    decimal = futures.function_get_decimal(position['symbol']);
                                    quantity = quantity.toFixed(decimal);
                                    console.log(quantity, position['sizeX'], row.sizeX);
                                    if (position['side'] == "Buy") {
                                        futures.futures_long_selling(position['symbol'], (quantity).toString());
                                    }
                                    else{
                                        futures.futures_short_buying(position['symbol'], (quantity).toString());
                                    }
                                    noti.messengerBotSendText(public.USER_ID[0], serialize_message(position));
                                }
                            }
                        }
                    });
                });
                //if position is not in data
                db.each(`SELECT * FROM '${id.ID}'`, (err, row) => {
                    if (err) {
                        console.error(err.message);
                    }
                    if (!data.some((position) => position.symbol == row.symbol)) {
                        //delete position from database with symbol and side
                        db.run(`DELETE FROM '${id.ID}' WHERE symbol = ? AND side = ?`, [row.symbol, row.side])
                        //CConvert quantity to int then divide quantity by 1e8
                        let quantity = parseInt(row.sizeX) / 1e8;
                        quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                        decimal = futures.function_get_decimal(row.symbol);
                        quantity = quantity.toFixed(decimal);
                        console.log(quantity);
                        if (row.side == "Buy") {
                            futures.futures_long_selling(row.symbol, (quantity).toString());
                        }
                        else{
                            futures.futures_short_buying(row.symbol, (quantity).toString());
                        }
                        noti.messengerBotSendText(public.USER_ID[0], serialize_message(row));
                    }
                });
            });
        }
    } catch (e) {
        console.error(e);
        await run();
    }
}

async function main() {
    await init();
    console.log("Database is initialized");
    try {
        await run();
    } catch (e) {
        console.error(e);
    }
}

main();
