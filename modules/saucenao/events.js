const SauceNAO = require('saucenao')
const mySauce = new SauceNAO('96756c392a0d5b5382ef369a5418e7bbdaa2b39c')

module.exports = {
  events: {
    message (client, db, moduleName, msg) {
      if (msg.channel.name === 'aesthetics' && msg.attachments.size > 0) {
        msg.attachments.forEach(attach => {
          mySauce(attach.url).then(response => {
            const results = response.json.results.filter(e => parseFloat(e.header.similarity) > 80).sort((a, b) => a - b)
            console.log(results)
          }, (error) => {
            console.error('Request encountered an error')
            console.dir(error.request)
          })
        })
      }
    }
  }
}
