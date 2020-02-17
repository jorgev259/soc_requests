
let running = false
let radioChannel
let message

module.exports = {
  events: {
    async ready (client, db) {
      radioChannel = await client.guilds.cache.first().channels.cache.find(c => c.name === 'Radio').fetch()
      const members = radioChannel.members.filter(m => m.id !== m.guild.me.id)
      if (members.size === 0) radioChannel.leave()
      else {
        const connection = await radioChannel.join()
        connection.play('https://play.squid-radio.net/clouds', { bitrate: 'auto' })
        running = true
      }

      const channel = client.guilds.cache.first().channels.cache.find(c => c.name === 'now-playing')
      const messages = (await channel.messages.fetch()).filter(m => m.author.id === m.guild.me.id)
      await Promise.all(messages.map(m => m.delete()))

      var socket = require('socket.io-client')('https://api.squid-radio.net')
      socket.on('metadata', async (data) => {
        console.log([
          {
            name: 'Album',
            value: data.album,
            inline: true
          },
          {
            name: 'Artist',
            value: data.artist,
            inline: true
          },
          {
            name: 'Track',
            value: data.title,
            inline: true
          }
        ]
        )
        const newMessage = await channel.send({
          embed: {
            color: 1719241,
            thumbnail: {
              url: encodeURI(`https://squid-radio.net/covers/${data.album}.jpg`)
            },
            title: 'Now Playing',
            url: 'https://play.squid-radio.net/clouds',
            fields: [
              {
                name: 'Album',
                value: data.album,
                inline: true
              },
              {
                name: 'Artist',
                value: data.artist,
                inline: true
              },
              {
                name: 'Track',
                value: data.title,
                inline: true
              }
            ]
          }
        })
        if (message) message.delete()
        message = newMessage
      })
    },
    async voiceStateUpdate (client, db) {
      const members = radioChannel.members.filter(m => m.id !== m.guild.me.id)
      if (running) {
        if (members.size === 0) {
          await radioChannel.leave()
          running = false
        }
      } else {
        if (members.size > 0) {
          const connection = await radioChannel.join()
          connection.play('https://play.squid-radio.net/clouds', { bitrate: 'auto' })
          running = true
        }
      }
    }
  }
}
