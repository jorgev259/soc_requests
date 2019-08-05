let { get } = require('axios')
let status
module.exports.events = {
  async ready (client, db) {
    get('https://www.sittingonclouds.net/').then(res => {
      console.log(res.status)
      status = res.status
      start(client)
    }).catch(res => {
      console.log(res.status)
      status = res.status
      start(client)
    })
  }
}

function start (client) {
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
}
