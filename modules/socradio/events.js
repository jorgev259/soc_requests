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
          const title = entities.decode(parsed.StreamTitle)

          console.log(title)
        })

        res.pipe(devnull())
      })
    }
  }
}
