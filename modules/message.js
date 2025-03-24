const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'message',
    description: '메시지 관리',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    commands: [
        {
            name: 'purge',
            description: '일정 개수 만큼의 메시지를 삭제합니다.',
            ephemeral: true,
            optionGenerator: o =>
                o.addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('메시지 개수')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50)),
            callback: async function (interaction) {
                const count = interaction.options.getInteger('count');

                await interaction.channel.bulkDelete(count, true);

                await interaction.deleteReply();
            },
        },
    ],
};
