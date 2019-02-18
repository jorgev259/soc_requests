const { MessageEmbed } = require('discord.js')
const moment = require('moment')
module.exports.commands = {
  whois: {
    desc: 'Shows user\'s info',
    usage: '>whois [@user]',
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
  },
  serverinfo: {
    desc: 'Shows current server info.',
    async execute (client, msg, param, db) {
      let guild = msg.guild
      const embed = new MessageEmbed()
        .setAuthor(guild.name, guild.iconURL())
        .setThumbnail(guild.iconURL())
        .setFooter(`ID: ${guild.id}`)
        .setTimestamp()

      let members = await guild.members.fetch()

      embed.fields = [
        {
          name: 'Owner',
          value: guild.owner.user.tag,
          inline: true
        },
        {
          name: 'Region',
          value: guild.region,
          inline: true
        },
        {
          name: 'Channel Categories',
          value: guild.channels.filter(c => c.type === 'category').size,
          inline: true
        },
        {
          name: 'Text Channels',
          value: guild.channels.filter(c => c.type === 'text').size,
          inline: true
        },
        {
          name: `Voice Channels`,
          value: guild.channels.filter(c => c.type === 'voice').size,
          inline: true
        },
        {
          name: 'Members',
          value: members.size,
          inline: true
        },
        {
          name: 'Humans',
          value: members.filter(m => !m.user.bot).size,
          inline: true
        },
        {
          name: 'Bots',
          value: members.filter(m => m.user.bot).size,
          inline: true
        },
        {
          name: 'Online',
          value: members.filter(m => m.presence.status === 'online').size,
          inline: true
        },
        {
          name: 'Roles',
          value: guild.roles.size,
          inline: true
        }
      ]

      msg.channel.send(embed)
    }
  }
}
