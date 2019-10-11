var icy = require('icy')
var devnull = require('dev-null')
const Entities = require('html-entities').AllHtmlEntities
const Qs = require('qs')
const axios = require('axios')

const entities = new Entities()
module.exports = {
  events: {
    async ready (client, db) {
      icy.get('https://play.sittingonclouds.net/clouds', function (res) {
        // log any "metadata" events that happen
        res.on('metadata', async function (metadata) {
          const parsed = icy.parse(metadata)
          const fullTitle = parsed.StreamTitle.split('-')
          const artistComposer = fullTitle.shift().split('/')
          const title = entities.decode(fullTitle.join('-'))
          const artist = entities.decode(artistComposer[0])
          let composer

          if (artistComposer.length > 1) {
            composer = entities.decode(artistComposer[1])
          }

          console.log({
            title: title.trim(),
            artist: artist.trim(),
            composer: composer.trim()
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
