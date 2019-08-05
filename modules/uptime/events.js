let { get } = require('axios')
let status
module.exports = {
  async ready (client, db) {
    get('https://www.sittingonclouds.net/').then(res => {
      status = res.status
      setTimeout(() => {
        get('https://www.sittingonclouds.net/').then(res => {
          console.log(res.status)
          if (res.status !== status) {
            status = res.status
            client.guilds.first().channels.find(c => c.name === 'administration').send(`www.sittingonclouds.net status changed to ${status}`)
          }
        })
      }, 1000)
    })
    
  }
}
