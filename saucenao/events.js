const SauceNAO = global.requireFn('saucenao')
const getUrls = global.requireFn('get-urls')

let mySauce

module.exports = {
  async message (client, sequelize, moduleName, msg) {
    const { saucenaoToken } = client.config.saucenao.config
    if (!mySauce) mySauce = new SauceNAO(saucenaoToken)

    const item = await sequelize.models.saucenao.findOne({ where: { guild: msg.guild.id, channel: msg.channel.id } })
    if (!item) return
    if (msg.attachments.size > 0) checkAttachment(msg)

    const urls = getUrls(msg.content)
    if (urls.size > 0) checkUrls(msg, urls)
  }
}

function checkAttachment (msg) {
  msg.attachments.forEach(attach => {
    mySauce(attach.url).then(response => {
      const results = response.json.results.filter(e => parseFloat(e.header.similarity) > 80).sort((a, b) => a - b)
      if (results.length) {
        msg.channel.send(`Found source: ${results.map(e => {
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

function checkUrls (msg, urls) {
  for (const url of urls) {
    mySauce(url).then(response => {
      const results = response.json.results.filter(e => parseFloat(e.header.similarity) > 80).sort((a, b) => a - b)
      if (results.length) {
        msg.channel.send(`Found source: ${results.map(e => {
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
  }
}
