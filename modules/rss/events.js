var AsyncPolling = require('async-polling')
const Parser = require('rss-parser')
const parser = new Parser()
var rss = {}

const urls = require('../../data/rss/rss.json')
module.exports.events = {
  async ready (client, db) {
    console.log(urls)
    urls.forEach(url => {
      console.log(url)
    })
  }
}
