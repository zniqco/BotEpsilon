const { config } = require('./config.json');
const { Client, REST, Events, GatewayIntentBits, Collection, Routes } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const rest = new REST({ version: '10' }).setToken(config.token);
const commands = new Collection();
const messageReceivers = [];

(async () => {
    // Load modules
    const fs = require('node:fs');
    const path = require('node:path');
    const modules = [];
    const modulePath = path.join(__dirname, 'modules');
    const moduleFiles = fs.readdirSync(modulePath).filter(file => file.endsWith('.js'));

    for (const file of moduleFiles) {
        const filePath = path.join(modulePath, file);
        const module = require(filePath);
    
        if ('commandData' in module && 'commandExecutor' in module) { // Has command?
            modules.push(module.commandData.toJSON());
            commands.set(module.commandData.name, module.commandExecutor);
        }

        if ('messageReceiver' in module) {
            messageReceivers.push(module.messageReceiver);
        }
    }

    // Login
    client.once(Events.ClientReady, async c => {
        console.log(`Logged in as '${c.user.tag}'`);

        // Push commands
        try {
            const data = await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: modules },
            );
    
            console.log(`${data.length} command(s) loaded`);
        } catch (e) {
            console.error(e);
        }
    });    

    // Listen commands
    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName);

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

    // Listen messages
    client.on(Events.MessageCreate, message => {
        if (message && !message.reference && message.author.id != client.user.id) {
            for (const receiver of messageReceivers)
                receiver(message);
        }
    });    
})();

client.login(config.token);
