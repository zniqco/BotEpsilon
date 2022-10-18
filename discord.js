const { config } = require('./config.json');
const { REST, Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const rest = new REST({ version: '10' }).setToken(config.token);

module.exports = {
    client: client,
    rest: rest,
}
