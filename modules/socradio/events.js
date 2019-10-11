var icy = require('icy')
var devnull = require('dev-null')
const Entities = require('html-entities').AllHtmlEntities

const entities = new Entities()
module.exports = {
  events: {
    async ready (client, db) {
      icy.get('https://play.sittingonclouds.net/clouds', function (res) {
        // log any "metadata" events that happen
        res.on('metadata', function (metadata) {
          const parsed = icy.parse(metadata)
          const fullTitle = entities.decode(parsed.StreamTitle).split('-')
          const artistComposer = fullTitle.shift().split('/')
          const title = fullTitle.join('-')
          const artist = artistComposer[0]
          let composer

          if (artistComposer.length > 1) {
            composer = artistComposer[1]
          }

          console.log({
            title: title,
            artist: artist,
            composer: composer
          })
        })

        res.pipe(devnull())
      })
    }
  }
}
