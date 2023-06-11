const config = require('./config.js');
const fs = require('node:fs');
const { Client, REST, Events, GatewayIntentBits, Collection, Routes } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const commandHandlers = new Collection();
const messageReceivers = [];

// Modules
const modules = [];
const moduleFiles = fs.readdirSync('./modules').filter(file => file.endsWith('.js'));

for (const file of moduleFiles) {
    const module = require('./modules/' + file);

    if ('commandData' in module && 'commandExecutor' in module) { // Has command?
        modules.push(module.commandData.toJSON());
        commandHandlers.set(module.commandData.name, module.commandExecutor);
    }

    if ('messageReceiver' in module) {
        messageReceivers.push(module.messageReceiver);
    }
}

// Commands
const rest = new REST({ version: '10' }).setToken(config.token);

client.once(Events.ClientReady, async c => {
    console.log(`Logged in as '${c.user.tag}'`);

    try {
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: modules },
        );
    } catch (e) {
        console.error(e);
    }
});    

// Events
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = commandHandlers.get(interaction.commandName);

        if (command) {
            try {
                await command(interaction);
            } catch (e) {
                console.error(e);

                await interaction.reply({ content: '명령어를 실행하는데 실패했습니다.', ephemeral: true });
            }
        }
    }
});

client.on(Events.MessageCreate, message => {
    if (message && !message.reference && message.author.id != client.user.id) {
        for (const receiver of messageReceivers)
            receiver(message);
    }
});

// Login
client.login(config.token);
