const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('message')
        .setDescription('메시지 관리')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand.setName('purge')
                .setDescription('메시지를 삭제합니다.')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('메시지 개수')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50))),
    commandExecutor: async function (interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'purge':
                const count = interaction.options.getInteger('count');

                await interaction.reply({ content: `삭제 중 입니다...`, ephemeral: true });
                await interaction.channel.bulkDelete(count, true);
                await interaction.deleteReply();

                break;
        }
    },
};
