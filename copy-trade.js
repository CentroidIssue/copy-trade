const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const futures = require('./futures.js');
const public = require('./config/public.js');
const noti = require('./noti.js')
const { exit } = require('process');
const db = new sqlite3.Database('database/checker.db');
const url = "https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/lead-data/positions?portfolioId=3759467119395688704";

console.log("Opened database successfully");

async function init_sqlite3() {
    const response = await axios.get(url);
    const data = response.data.data;

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS positions
                (id text, symbol text, collateral text, positionAmount text, entryPrice text, unrealizedProfit text, cumRealized text, askNotional text, bidNotional text, notionalValue text, markPrice text, leverage text, isolated text, isolatedWallet text, adl text, positionSide text, breakEvenPrice text)`);

        db.run("DELETE FROM positions");

        data.forEach(position => {
            db.run(`INSERT INTO positions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['id'], position['symbol'], position['collateral'], position['positionAmount'], position['entryPrice'], position['unrealizedProfit'], position['cumRealized'], position['askNotional'], position['bidNotional'], position['notionalValue'], position['markPrice'], position['leverage'], position['isolated'], position['isolatedWallet'], position['adl'], position['positionSide'], position['breakEvenPrice']]);
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
            const response = await axios.get(url);
            const data = response.data.data;
            data.forEach(async position => {
                let decimal = 0;
                if (position['positionAmount'].includes('.')) {
                    decimal = position['positionAmount'].split('.')[1].length;
                }
                let quantity = parseFloat(position['positionAmount'], 10);
                const side = position['positionSide'];

                db.get("SELECT * FROM positions WHERE id=?", [position['id']], (err, row) => {
                    if (err) {
                        return console.error(err.message);
                    }
                    if (!row) {
                        db.run(`INSERT INTO positions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['id'], position['symbol'], position['collateral'], position['positionAmount'], position['entryPrice'], position['unrealizedProfit'], position['cumRealized'], position['askNotional'], position['bidNotional'], position['notionalValue'], position['markPrice'], position['leverage'], position['isolated'], position['isolatedWallet'], position['adl'], position['positionSide'], position['breakEvenPrice']]);
                        console.log(public.USER_ID[0], "New position:\n" + serialize_message(position));
                        if (side == "LONG") {
                            quantity = quantity * public.ORDER_SCALE;
                            //Round to decimal
                            quantity = quantity.toFixed(decimal);
                            futures.buy(position['symbol'], quantity);
                        }
                        else{
                            quantity = -quantity;
                            quantity = quantity * public.ORDER_SCALE;
                            //Round to decimal
                            quantity = quantity.toFixed(decimal);
                            futures.sell(position['symbol'], quantity);
                        }
                        noti.messengerBotSendText(public.USER_ID[0], );
                    } else if (row.positionAmount != position['positionAmount']) {
                        db.run("UPDATE positions SET positionAmount=? WHERE id=?", [position['positionAmount'], position['id']]);
                        console.log(quantity, row.positionAmount, decimal)
                        quantity = quantity - parseFloat(row.positionAmount, 10);
                        console.log(quantity)
                        if (quantity > 0) {
                            quantity = quantity * public.ORDER_SCALE;
                            //Round to decimal
                            quantity = quantity.toFixed(decimal);
                            futures.buy(position['symbol'], quantity);
                        }
                        else if (quantity < 0){
                            quantity = -quantity;
                            quantity = quantity * public.ORDER_SCALE;
                            //Round to decimal
                            quantity = quantity.toFixed(decimal);
                            futures.sell(position['symbol'], quantity);
                        }
                        noti.messengerBotSendText(public.USER_ID[0], "Changed position: " + serialize_message(position) + "Initial position: " + row.positionAmount);
                        console.log("Position amount of " + position['symbol'] + " has changed");
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
    await init_sqlite3();
    try {
        await run();
    } catch (e) {
        console.error(e);
    }
}

main();