const config = require('./config.js');
const fs = require('node:fs');
const { Client, Events, GatewayIntentBits, MessageFlags, REST, SlashCommandBuilder, Routes } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const commands = {};
const messageReceivers = [];

// Modules
const commandDatas = [];
const moduleFiles = fs.readdirSync('./modules').filter(file => file.endsWith('.js'));

for (const file of moduleFiles) {
    const module = require('./modules/' + file);

    if ('commands' in module) { // Has command?
        const builder = new SlashCommandBuilder();

        builder.setName(module.name);
        builder.setDescription(module.description);

        if (builder.defaultMemberPermissions)
            builder.setDefaultMemberPermissions(builder.defaultMemberPermissions);

        for (const command of module.commands) {
            builder.addSubcommand(subcommand => {
                subcommand.setName(command.name);
                subcommand.setDescription(command.description);

                if (command.optionGenerator)
                    command.optionGenerator(subcommand); // TODO: Migrate to custom options

                return subcommand;
            });

            commands[`${module.name}/${command.name}`] = command;
        }

        commandDatas.push(builder.toJSON());
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

    const command = interaction.commandName;
    const subcommand = interaction.options.getSubcommand();
    const entry = commands[`${command}/${subcommand}`];

    if (!entry)
        return await interaction.reply({ content: '명령어를 실행하는데 실패했습니다. (NF)', flags: MessageFlags.Ephemeral });

    if (entry.ephemeral)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    else
        await interaction.deferReply();

    try {
        await entry.callback(interaction);
    } catch (e) {
        console.error(e);

        await interaction.editReply({ content: '명령어를 실행하는데 실패했습니다. (EX)' });
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
