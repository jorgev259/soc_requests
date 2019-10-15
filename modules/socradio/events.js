var icy = require('icy-socket')
const Qs = require('qs')
const axios = require('axios')
let running = false
let radioChannel
module.exports = {
  events: {
    async ready (client, db) {
      const channel = client.guilds.first().channels.find(c => c.name === 'now-playing')
      const messages = await channel.messages.fetch()
      await Promise.all(messages.map(m => m.delete))

      let message
      radioChannel = await client.guilds.first().channels.find(c => c.name === 'Radio').fetch()
      await radioChannel.leave()
      icy.fn('https://play.sittingonclouds.net/clouds', async parsed => {
        const fullTitle = parsed.StreamTitle.split('-')
        const artist = fullTitle.shift()
        const title = fullTitle.join('-')

        let { data } = await axios.get('https://api.sittingonclouds.net/song', {
          params: {
            title: title.trim(),
            artist: artist.trim()
          },

          paramsSerializer: function (params) {
            return Qs.stringify(params, { arrayFormat: 'repeat' })
          }
        })

        if (data.length === 0) data = [{ album: 'Not Found', artist: artist.trim(), title: title.trim() }]
        console.log([
          {
            name: 'Album',
            value: data[0].album,
            inline: true
          },
          {
            name: 'Artist',
            value: data[0].artist,
            inline: true
          },
          {
            name: 'Track',
            value: data[0].title,
            inline: true
          }
        ]
        )
        const newMessage = await channel.send({
          embed: {
            color: 1719241,
            thumbnail: {
              url: encodeURI(`https://radio.sittingonclouds.net/covers/${data[0].album}.jpg`)
            },
            title: 'Now Playing',
            url: 'https://play.sittingonclouds.net/clouds',
            fields: [
              {
                name: 'Album',
                value: data[0].album,
                inline: true
              },
              {
                name: 'Artist',
                value: data[0].artist,
                inline: true
              },
              {
                name: 'Track',
                value: data[0].title,
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
