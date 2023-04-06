const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('./database.db', sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE);

db.run('CREATE TABLE IF NOT EXISTS `memo` (\n' + 
    '`guild_id` varchar(22) NOT NULL,\n' +
    '`text` varchar(128) NOT NULL,\n' +
    '`contents` varchar(512) NOT NULL,\n' +
    'PRIMARY KEY (`guild_id`,`text`))');

module.exports = {
    execute: async (query, params) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(query, ...params, prepareErr => {
                if (prepareErr) {
                    return reject(prepareErr);
                } else {
                    stmt.run(err => {
                        if (err)
                            return reject(err);
                        else
                            resolve(stmt);
                    })
                }
            });
        });
    },
    get: async (query, params) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(query, ...params, prepareErr => {
                if (prepareErr) {
                    return reject(prepareErr);
                } else {
                    stmt.get((err, row) => {
                        if (err)
                            return reject(err);
                        else
                            resolve(row);
                    })
                }
            });
        });
    }
};
