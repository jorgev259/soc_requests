let { get } = require('axios')
let moment = require('moment')
let status
module.exports.events = {
  async ready (client, db) {
    get('https://www.sittingonclouds.net/').then(res => {
      status = res.status
      start(client)
    }).catch(err => {
      status = err.response.status
      start(client)
    })
  }
}

function start (client) {
  setInterval(() => {
    get('https://www.sittingonclouds.net/').then(res => {
      handle(client, res.status)
    }).catch(err => {
      handle(client, err.response.status)
    })
  }, 5000)
}

function handle (client, statusInc) {
  if (statusInc !== status) {
    status = statusInc
    client.guilds.first().channels.find(c => c.name === 'server-downtime').send(
      status === 200
        ? `**:white_check_mark: sittingonclouds.net Server is Up: It should work fine again! - Reason: Server is Reachable`
        : `**:no_entry: sittingonclouds.net Server is Down: Its Probally a Maintainance or its really Down. - Reason: Connection Timeout - Time: ${moment().utc().format('YYYY/MM/DD hh:mm:ss A')} UTC**`
    )
  }
}
