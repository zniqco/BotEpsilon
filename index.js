const config = require('./config.js');
const fs = require('node:fs');
const { Client, REST, Events, GatewayIntentBits, Collection, Routes } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const commandHandlers = {};
const messageReceivers = [];

// Modules
const commandDatas = [];
const moduleFiles = fs.readdirSync('./modules').filter(file => file.endsWith('.js'));

for (const file of moduleFiles) {
    const module = require('./modules/' + file);

    if ('commandData' in module && 'commandHandler' in module) { // Has command?
        commandDatas.push(module.commandData.toJSON());
        commandHandlers[module.commandData.name] = module.commandHandler;
    }

    if ('messageReceiver' in module) {
        messageReceivers.push(module.messageReceiver);
    }
}

// Commands
const rest = new REST({ version: '10' }).setToken(config.token);

client.once(Events.ClientReady, async c => {
    console.log(`Logged in as '${c.user.tag}'`);

    await rest.put(Routes.applicationCommands(config.clientId),
        { body: commandDatas },
    );
});    

// Events
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand())
        return;

    const handler = commandHandlers[interaction.commandName];

    if (handler) {
        const subcommand = interaction.options.getSubcommand();
        const entry = handler[subcommand];

        if (!entry)
            return await interaction.reply({ content: '명령어를 실행하는데 실패했습니다. (NF)', ephemeral: true });

        await interaction.deferReply({ ephemeral: entry.ephemeral ?? false });

        try {
            await entry.execute(interaction);
        } catch (e) {
            console.error(e);

            await interaction.editReply({ content: '명령어를 실행하는데 실패했습니다. (EX)' });
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
