
let running = false
let radioChannel, message
const axios = require('axios')
const stations = {}

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

      axios.get('https://api.squid-radio.net/stations')
        .then(res => {
          res.data.forEach(station => {
            socket.on(station, async (data) => {
              if (data !== null) {
                stations[station] = data
                if (Object.keys(stations).length >= res.data.length) {
                  const sendData = {
                    embed: {
                      color: 1719241,
                      thumbnail: {
                        url: `https://squid-radio.net/images/station/station_${station}.png`
                      },
                      title: 'Now Playing',
                      url: 'https://squid-radio.net',
                      fields: Object.keys(stations).map(stationName => {
                        return {
                          name: capitalize(stationName),
                          value: `${stations[stationName].album} / ${stations[stationName].artist} / ${stations[stationName].title}`,
                          inline: true
                        }
                      })
                    }
                  }

                  if (!message) message = await channel.send(sendData)
                  else await message.edit(sendData)
                }
              }
            })
          })
        })
        .catch(err => {
          console.log('failed to fetch stations')
          console.log(err)
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

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
