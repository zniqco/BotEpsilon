const { config } = require('./config.json');
const { Collection, Routes } = require('discord.js');
const discord = require('./discord.js');

discord.client.commands = new Collection();

(async () => {
    const fs = require('node:fs');
    const path = require('node:path');

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
    
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            discord.client.commands.set(command.data.name, command);
        } else {
            console.log(`command: ${filePath}: Missing 'data' or 'execute' property`);
        }
    }
    
    try {
        const data = await discord.rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log(`command: ${data.length} command(s) loaded`);
    } catch (e) {
        console.error(e);
    }
})();

discord.client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (command) {
            try {
                await command.execute(interaction);
            } catch (e) {
                console.error(e);

                await interaction.reply({ content: '명령어를 실행하는데 실패했습니다.', ephemeral: true });
            }
        }
    }
});
