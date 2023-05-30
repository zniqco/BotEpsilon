const fs = require('node:fs');
const configFile = fs.existsSync('./config.json') ? require('./config.json') : {};

module.exports = {
    clientId: configFile.CLIENT_ID ?? process.env.BOT_EPSILON_CLIENT_ID,
    token: configFile.TOKEN ?? process.env.BOT_EPSILON_TOKEN,
};
