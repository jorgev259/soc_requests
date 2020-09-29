module.exports = {
  enablesauce: {
    desc: 'Enables saucebot on the current channel',
    help: '>enablesauce',
    async execute (client, msg, param, sequelize) {
      await sequelize.models.saucenao.findOrCreate({ where: { guild: msg.guild.id, channel: msg.channel.id } })
      msg.channel.send('Saucenao enabled on this channel')
    }
  },
  disablesauce: {
    desc: 'Disables saucebot on the current channel',
    help: '>disablesauce',
    async execute (client, msg, param, sequelize) {
      await sequelize.models.saucenao.destroy({ where: { guild: msg.guild.id, channel: msg.channel.id } })
      msg.channel.send('Saucenao disabled from this channel')
    }
  }
}
