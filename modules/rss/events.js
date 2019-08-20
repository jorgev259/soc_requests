var asyncPolling = require('async-polling')
const Parser = require('rss-parser')
const parser = new Parser()
var rss = {}
var cache = {}
const urls = ['https://www.hetzner-status.de/en.atom', 'https://www.cloudflarestatus.com/history.atom']

module.exports = {
  async reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS rss (id TEXT, url TEXT, PRIMARY KEY (id,url))').run()
  },
  events: {
    async ready (client, db) {
      urls.forEach(async url => {
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
            outItems.forEach(item => client.guilds.first().channels.find(c => c.name === 'provider-downtime').send(`${item.title}\n${item.url}\n${item.pubDate}`))
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
}
