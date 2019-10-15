var socket = require('socket.io-client')('https://api.sittingonclouds.net')
let running = false
let radioChannel

module.exports = {
  events: {
    async ready (client, db) {
      let message
      radioChannel = await client.guilds.first().channels.find(c => c.name === 'Radio').fetch()
      radioChannel.leave()

      const channel = client.guilds.first().channels.find(c => c.name === 'now-playing')
      const messages = (await channel.messages.fetch()).filter(m => m.author.id === m.guild.me.id)
      await Promise.all(messages.map(m => m.delete()))

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
              url: encodeURI(`https://radio.sittingonclouds.net/covers/${data.album}.jpg`)
            },
            title: 'Now Playing',
            url: 'https://play.sittingonclouds.net/clouds',
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
          connection.play('https://play.sittingonclouds.net/clouds', { bitrate: 'auto' })
          running = true
        }
      }
    }
  }
}
