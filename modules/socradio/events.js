var icy = require('icy')
var devnull = require('dev-null')
const Entities = require('html-entities').AllHtmlEntities
const mysql = require('promise-mysql')

const entities = new Entities()
module.exports = {
  events: {
    async ready (client, db) {
      var config = client.data['socradio.config']
      let pool

      try {
        pool = await mysql.createPool(config.mysql)
      } catch (err) { console.log(err) }
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
            title: title,
            artist: artist,
            composer: composer
          })
          let query
          if (composer) query = await pool.query('SELECT title,artist,album.name as album FROM song, album WHERE song.album = album.name AND title = ? AND artist = ? AND composer = ? LIMIT 1', [title, artist, composer])
          else query = await pool.query('SELECT title,artist,album.name as album FROM song, album.name WHERE song.album = album.name AND title = ? AND artist = ? LIMIT 1', [title, artist])
          console.log(query)
        })

        res.pipe(devnull())
      })
    }
  }
}
