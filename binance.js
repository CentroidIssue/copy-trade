const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const futures = require('./binance_futures.js');
const public = require('./config/public.json');
const noti = require('./noti.js')
const fs = require('fs');
const { exit } = require('process');
const { table } = require('console');

// Create new file binance.db if not exist
if (!fs.existsSync('database')) {
    fs.writeFile('database/binance.db', '', function (err) {
        if (err) return console.log(err);
    });
}
const db = new sqlite3.Database('database/binance.db');

console.log("Opened database successfully");
const base_url = public.BINANCE_LEADER_POSITION_API;

async function init() {
    noti.messengerBotSendText(public.USER_ID[0], "Background job is starting");
    //create file database/binance.db if not exist
    fs.writeFile('database/binance.db', '', function (err) {
        if (err) return console.log(err);
    });
    //get all data for all public.PROFILE_ID using axios asynchronously
    const promises = public.PROFILE_ID.map(async (id) => {
        const url = base_url + "portfolioId=" + id.ID;
        const response = await axios.get(url);
        return response;
    });
    //wait for all promises to be resolved
    const responses = await Promise.all(promises);
    //store all responses in response.data
    responses.data = responses.map((response) => response.data);
    //write response to database
    db.serialize(() => {
        //table name is public.PROFILE_ID[].ID
        public.PROFILE_ID.forEach((id) => {
            db.run(`CREATE TABLE IF NOT EXISTS '${id.ID}'
                (id text, symbol text, collateral text, positionAmount text, entryPrice text, unrealizedProfit text, cumRealized text, askNotional text, bidNotional text, notionalValue text, markPrice text, leverage text, isolated text, isolatedWallet text, adl text, positionSide text, breakEvenPrice text)`);
            //Delete all data in table
            db.run(`DELETE FROM '${id.ID}'`);
            //Insert data into table
            responses.data[public.PROFILE_ID.indexOf(id)].data.forEach((position) => {
                db.run(`INSERT INTO '${id.ID}' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['id'], position['symbol'], position['collateral'], position['positionAmount'], position['entryPrice'], position['unrealizedProfit'], position['cumRealized'], position['askNotional'], position['bidNotional'], position['notionalValue'], position['markPrice'], position['leverage'], position['isolated'], position['isolatedWallet'], position['adl'], position['positionSide'], position['breakEvenPrice']]);
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
            //get all data for all public.PROFILE_ID using axios asynchronously
            const promises = public.PROFILE_ID.map(async (id) => {
                const url = base_url + "portfolioId=" + id.ID;
                const response = await axios.get(url);
                return response;
            });
            //wait for all promises to be resolved
            const responses = await Promise.all(promises);
            //store all responses in response.data
            responses.data = responses.map((response) => response.data);
            //For all public.PROFILE_ID adn write data to ID.json
            public.PROFILE_ID.forEach((id) => {
                fs.writeFile('database/' + id.ID + '.json', JSON.stringify(responses.data[public.PROFILE_ID.indexOf(id)], null, 2), function (err) {
                    if (err) return console.log(err);
                });
            });
            //For all public.PROFILE_ID and compare data with database
            public.PROFILE_ID.forEach((id) => {
                const data = responses.data[public.PROFILE_ID.indexOf(id)].data;
                data.forEach(async position => {
                    let decimal = 0;
                    if (position['positionAmount'].includes('.')) {
                        decimal = position['positionAmount'].split('.')[1].length;
                    }
                    let quantity = parseFloat(position['positionAmount'], 10);
                    const side = position['positionSide'];
                    db.get(`SELECT * FROM '${id.ID}' WHERE id=?`, [position['id']], (err, row) => {
                        if (err) {
                            return console.error(err.message);
                        }
                        if (!row) {
                            db.run(`INSERT INTO '${id.ID}' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['id'], position['symbol'], position['collateral'], position['positionAmount'], position['entryPrice'], position['unrealizedProfit'], position['cumRealized'], position['askNotional'], position['bidNotional'], position['notionalValue'], position['markPrice'], position['leverage'], position['isolated'], position['isolatedWallet'], position['adl'], position['positionSide'], position['breakEvenPrice']]);
                            console.log(id.ID, "New position:\n" + serialize_message(position));
                            if (side == "LONG") {
                                quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                //Round to decimal
                                quantity = quantity.toFixed(decimal);
                                futures.futures_long_buying(position['symbol'], quantity);
                            }
                            else if (side == "SHORT"){
                                quantity = -quantity;
                                quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                //Round to decimal
                                quantity = quantity.toFixed(decimal);
                                futures.futures_short_selling(position['symbol'], quantity);
                            }
                            else if (side == "BOTH"){
                                if (quantity > 0) {
                                    quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                    //Round to decimal
                                    quantity = quantity.toFixed(decimal);
                                    futures.futures_long_buying(position['symbol'], quantity);
                                }
                                else if (quantity < 0){
                                    quantity = -quantity;
                                    quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                    //Round to decimal
                                    quantity = quantity.toFixed(decimal);
                                    futures.futures_short_selling(position['symbol'], quantity);
                                }
                            }
                            noti.messengerBotSendText(public.USER_ID[0], "New order: \n" + serialize_message(position));
                        }
                        else if (row.positionAmount != position['positionAmount']) {
                            db.run(`UPDATE '${id.ID}' SET positionAmount=? WHERE id=?`, [position['positionAmount'], position['id']]);
                            console.log(quantity, row.positionAmount, decimal);
                            last_quantity = quantity;
                            quantity = quantity - parseFloat(row.positionAmount, 10);
                            console.log(quantity)
                            quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO
                            //Round to decimal
                            quantity = quantity.toFixed(decimal);
                            if (side == "LONG") {
                                if (quantity > 0) {
                                    futures.futures_long_buying(position['symbol'], quantity);
                                }
                                else if (quantity < 0){
                                    futures.futures_long_selling(position['symbol'], -quantity);
                                }
                            }
                            else if (side == "SHORT"){
                                if (quantity < 0) {
                                    futures.futures_short_selling(position['symbol'], -quantity);
                                }
                                else if (quantity > 0){
                                    futures.futures_short_buying(position['symbol'], quantity);
                                }
                            }
                            else if (side == "BOTH"){
                                if (row.positionAmount > 0) {
                                    if (quantity > 0) {
                                        futures.futures_long_buying(position['symbol'], quantity);
                                    }
                                    else if (quantity < 0){
                                        futures.futures_long_selling(position['symbol'], -quantity);
                                    }
                                }
                                else if (row.positionAmount < 0){
                                    if (quantity < 0) {
                                        futures.futures_short_selling(position['symbol'], -quantity);
                                    }
                                    else if (quantity > 0){
                                        futures.futures_short_buying(position['symbol'], quantity);
                                    }
                                }
                                else{
                                    if (quantity > 0) {
                                        futures.futures_long_buying(position['symbol'], quantity);
                                    }
                                    else if (quantity < 0){
                                        futures.futures_short_selling(position['symbol'], -quantity);
                                    }
                                }
                                if (Math.abs(row.positionAmount) < Math.abs(last_quantity) && row.positionAmount * last_quantity < 0) {
                                    quantity = last_quantity + row.positionAmount;
                                    quantity = quantity * id.ORDER_SCALE.NUME / id.ORDER_SCALE.DENO;
                                    //Round to decimal
                                    quantity = quantity.toFixed(decimal);
                                    if (quantity > 0) {
                                        futures.futures_long_buying(position['symbol'], quantity);
                                    }
                                    else if (quantity < 0){
                                        futures.futures_short_selling(position['symbol'], -quantity);
                                    }
                                }
                            }
                            noti.messengerBotSendText(public.USER_ID[0], "Changed position: " + serialize_message(position) + "Initial position: " + row.positionAmount);
                            console.log("Position amount of " + position['symbol'] + " has changed");
                        }
                    });
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


main().catch(console.error);
