let { get } = require('axios')
let status
module.exports.events = {
  async ready (client, db) {
    get('https://www.sittingonclouds.net/').then(res => {
      status = res.status
      setInterval(() => {
        get('https://www.sittingonclouds.net/').then(res => {
          console.log(res.status)
          if (res.status !== status) {
            status = res.status
            client.guilds.first().channels.find(c => c.name === 'administration').send(`www.sittingonclouds.net status changed to ${status}`)
          }
        }).catch(res => {
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
