var icy = require('icy')
var devnull = require('dev-null')
const Qs = require('qs')
const axios = require('axios')

module.exports = {
  events: {
    async ready (client, db) {
      const channel = client.guilds.first().channels.find(c => c.name === 'now-playing')
      const messages = await channel.messages.fetch()
      await Promise.all(messages.map(m => m.delete))

      let message
      icy.get('https://play.sittingonclouds.net/clouds', function (res) {
        // log any "metadata" events that happen
        res.on('metadata', async function (metadata) {
          const parsed = icy.parse(metadata)
          const fullTitle = parsed.StreamTitle.split('-')
          const artistComposer = fullTitle.shift().split('/')
          const title = decodeURI(fullTitle.join('-'))
          const artist = decodeURI(artistComposer[0])
          let composer

          if (artistComposer.length > 1) {
            composer = decodeURI(artistComposer[1]).trim()
          }

          console.log({
            title: title.trim(),
            artist: artist.trim(),
            composer: composer
          })

          const { data } = await axios.get('https://api.sittingonclouds.net/song', {
            params: {
              title: title.trim(),
              artist: artist.trim(),
              composer: composer
            },

            paramsSerializer: function (params) {
              return Qs.stringify(params, { arrayFormat: 'repeat' })
            }
          })
          console.log(data)
          if (message) message.delete()
          message = await channel.send({
            embed: {
              color: 1719241,
              thumbnail: {
                url: `https://radio.sittingonclouds.net/covers/${data[0].album}.jpg`
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
        })

        res.pipe(devnull())
      })
    }
  }
}
