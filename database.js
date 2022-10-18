const { config } = require('./config.json');
const mysql = require('mysql2/promise');

module.exports = {
    connect: async callback => {
        const connection = await mysql.createConnection({
            host: config.databaseHost,
            user: config.databaseUser,
            password: config.databasePassword,
            database: config.databaseName,
        });

        try {
            await callback(connection);
        } catch (e) {
            console.error(e);
        } finally {
            connection.end();
        }
    }
};
