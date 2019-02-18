const { MessageEmbed } = require('discord.js')
const moment = require('moment')
module.exports.commands = {
  whois: {
    desc: 'asd',
    usage: 'asd',
    async execute (client, msg, param, db) {
      let user
      if (msg.mentions.members.size > 0) user = msg.mentions.members.first()
      else user = msg.member
      const embed = new MessageEmbed()
        .setAuthor(user.user.tag, user.user.displayAvatarURL())
        .setDescription(user)
        .setThumbnail(user.user.displayAvatarURL())
        .setFooter(`ID: ${user.id}`)
        .setTimestamp()

      embed.fields = [
        {
          name: 'Status',
          value: user.presence.status,
          inline: true
        },
        {
          name: 'Joined',
          value: moment(user.joinedAt).format('ddd, MMM D, YYYY k:m A'),
          inline: true
        },
        {
          name: 'Join Position',
          value: 'Soon',
          inline: true
        },
        {
          name: 'Registered',
          value: moment(user.user.createdAt).format('ddd, MMM D, YYYY k:m A'),
          inline: true
        },
        {
          name: `Roles [${user.roles.size - 1}]`,
          value: user.roles.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'None',
          inline: true
        }
      ]

      msg.channel.send(embed)
    }
  }
}
