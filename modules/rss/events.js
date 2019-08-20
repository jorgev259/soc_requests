var asyncPolling = require('async-polling')
const Parser = require('rss-parser')
const parser = new Parser()
var rss = {}
const urls = ['https://www.hetzner-status.de/en.atom', 'https://www.cloudflarestatus.com/history.atom']

module.exports.events = {
  async ready (client, db) {
    urls.forEach(url => {
      rss[url] = asyncPolling(async function (end) {
        const feed = await parser.parseURL(url)
        console.log(feed)

        end()
      }, 1000)

      rss[url].on('error', function (error) {
        console.log(error)
      })

      rss[url].on('result', function (result) {
        if (result) {
          console.log(result)
        }
      })
      rss[url].run()
    })
  }
}
