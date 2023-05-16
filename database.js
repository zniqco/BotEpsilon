const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('./data/database.db', sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE);

module.exports = {
    run: async (query, params) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(query, params, e1 => {
                if (e1)
                    return reject(e1);

                stmt.run(...params, e2 => {
                    if (e2)
                        reject(e2);
                    
                    resolve(stmt);
                });

                stmt.finalize();
            });
        });
    },
    runSync: (query, params) => {
        const stmt = db.prepare(query, params);

        stmt.run();
        stmt.finalize();
    },
    get: async (query, params) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(query, params, e1 => {
                if (e1) return reject(e1);

                stmt.get((e2, row) => {
                    if (e2)
                        return reject(e2);
                    
                    resolve(row);
                });

                stmt.finalize();
            });
        });
    },
    all: async (query, params) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(query, params, e1 => {
                if (e1) return reject(e1);

                stmt.all((e2, rows) => {
                    if (e2)
                        return reject(e2);
                    
                    resolve(rows);
                });

                stmt.finalize();
            });
        });
    }
};
