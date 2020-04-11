const path = require('path')
var asyncPolling = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('async-polling')
const Parser = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('rss-parser')
const parser = new Parser()
var rss = {}
var cache = {}

module.exports = {
  async ready (client, db) {
    var urls = client.config.rss.sources
    urls.forEach(async config => {
      const url = config.url
      const data = db.prepare('SELECT id FROM rss WHERE url=?').get(url)
      if (data) cache[url] = data.id
      else {
        const feed = await parser.parseURL(url)
        db.prepare('INSERT INTO rss (id,url) VALUES (?,?)').run(feed.items[0].id, url)
        cache[url] = feed.items[0].id
      }
      rss[url] = asyncPolling(async function (end) {
        const feed = await parser.parseURL(url)
        const outItems = []
        var run = true
        for (var i = 0; i < feed.items.length && run; i++) {
          if (feed.items[i].id !== cache[url]) outItems.push(feed.items[i])
          else run = false
        }
        if (outItems.length > 0) {
          db.prepare('UPDATE rss SET id = ?, url = ? WHERE id = ?').run(outItems[0].id, url, cache[url])
          cache[url] = outItems[0].id
          console.log(url)
          console.log(config.filter(item => item.url === url))
          console.log(outItems)
          config.filter(item => item.url === url).forEach(channel => outItems.forEach(item => client.guilds.cache.first().channels.cache.find(c => c.name === channel.channel).send(`${item.title}\n${item.url}\n${item.pubDate}`)))
        }

        end()
      }, 1000)

      rss[url].on('error', function (error) {
        console.log(error)
      })

      rss[url].run()
    })
  }
}
