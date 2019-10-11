var icy = require('icy')
var devnull = require('dev-null')
const Qs = require('qs')
const axios = require('axios')

module.exports = {
  events: {
    async ready (client, db) {
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
              title: title,
              artist: artist,
              composer: composer
            },

            paramsSerializer: function (params) {
              return Qs.stringify(params, { arrayFormat: 'repeat' })
            }
          })
          console.log(data)
        })

        res.pipe(devnull())
      })
    }
  }
}
