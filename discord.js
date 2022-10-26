const { config } = require('./config.json');
const { Client, REST, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const rest = new REST({ version: '10' }).setToken(config.token);

client.once(Events.ClientReady, c => {
    console.log(`discord: Logged in as '${c.user.tag}'`);
});

module.exports = {
    client: client,
    rest: rest,
    login: () => {
        client.login(config.token);
    }
}
