const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/binance.db');
const url = "https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/lead-data/positions?portfolioId=3679841931111501312";

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

async function run() {
    try {
        while (true) {
            console.log("Checking positions at " + new Date().toISOString());
            const response = await axios.get(url);
            const data = response.data.data;

            data.forEach(async position => {
                const decimal = position['positionAmount'].split('.')[1].length;
                const amount = Math.round(parseFloat(position['positionAmount']) / 30, decimal);
                const side = position['positionSide'];

                db.get("SELECT * FROM positions WHERE id=?", [position['id']], (err, row) => {
                    if (err) {
                        return console.error(err.message);
                    }

                    if (!row) {
                        db.run(`INSERT INTO positions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [position['id'], position['symbol'], position['collateral'], position['positionAmount'], position['entryPrice'], position['unrealizedProfit'], position['cumRealized'], position['askNotional'], position['bidNotional'], position['notionalValue'], position['markPrice'], position['leverage'], position['isolated'], position['isolatedWallet'], position['adl'], position['positionSide'], position['breakEvenPrice']]);
                        console.log("New position of " + position['symbol'] + " has been opened");
                    } else if (row.positionAmount != position['positionAmount']) {
                        db.run("UPDATE positions SET positionAmount=? WHERE id=?", [position['positionAmount'], position['id']]);
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