const fs = require('node:fs');
const configFile = fs.existsSync('./config.json') ? require('./config.json') : {};

module.exports = {
    clientId: configFile.clientId ?? process.env.BOT_EPSILON_CLIENT_ID,
    token: configFile.token ?? process.env.BOT_EPSILON_TOKEN,
    databasePath: configFile.databasePath ?? process.env.BOT_EPSILON_DATABASE_PATH ?? './database.db'
};
