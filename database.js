const { config } = require('./config.json');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: config.databaseHost,
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    connectionLimit: 8,
});

module.exports = {
    getConnection: async callback => {
        const conn = await pool.getConnection();

        try {
            await callback(conn);
        } catch (e) {
            console.error(e);
        } finally {
            conn.release();
        }
    },
};
