const path = require('path')
const SauceNAO = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('saucenao')
let mySauce

module.exports = {
  message (client, db, moduleName, msg) {
    const { saucenaoToken } = client.config.saucenao
    if (!mySauce) mySauce = new SauceNAO(saucenaoToken)

    const item = db.prepare('SELECT channel FROM saucenao WHERE guild=? AND channel=?').get(msg.guild.id, msg.channel.id)
    if (item && msg.attachments.size > 0) {
      msg.attachments.forEach(attach => {
        mySauce(attach.url).then(response => {
          const results = response.json.results.filter(e => parseFloat(e.header.similarity) > 80).sort((a, b) => a - b)
          if (results.length) {
            msg.channel.send(`Found source: ${
                    results.map(e => {
                        if (e.data.pixiv_id) {
                            return `<https://www.pixiv.net/en/artworks/${e.data.pixiv_id}>`
                        } else {
                            return e.data.ext_urls.map(url => `<${url}>`).join(' - ')
                        }
                    }).join(' - ')
                }`)
          }
        }, (error) => {
          console.error('Request encountered an error')
          console.dir(error.request)
        })
      })
    }
  }
}
