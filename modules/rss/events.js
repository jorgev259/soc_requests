var AsyncPolling = require('async-polling')
const Parser = require('rss-parser')
const parser = new Parser()
var rss = {}

module.exports.events = {
  async ready (client, db) {
    client.data.config.rss.forEach(url => {
      console.log(url)
    })
  }
}