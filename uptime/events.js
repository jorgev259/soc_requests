const path = require('path')
const { get } = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('axios')
const moment = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('moment')
let status
module.exports = {
  async ready (client, db) {
    get('https://www.sittingonclouds.net/').then(res => {
      status = res.status === 200
      start(client)
    }).catch(err => {
      status = err.response.status === 200
      start(client)
    })
  }
}

function start (client) {
  get('https://www.sittingonclouds.net/').then(res => {
    handle(client, res.status === 200)
  }).catch(err => {
    handle(client, err.response.status === 200)
  })
}

async function handle (client, statusInc) {
  if (statusInc !== status) {
    status = statusInc
    await client.guilds.cache.first().channels.cache.find(c => c.name === 'server-downtime').send(
      status
        ? `**:white_check_mark: Main Server is Up: It should work fine again! - Reason: Server is Reachable - Time: ${moment().utc().format('YYYY/MM/DD hh:mm:ss A')} UTC**`
        : `**:no_entry: Main Server is Down: Its Probally a Maintainance or its really Down. - Reason: Connection Timeout - Time: ${moment().utc().format('YYYY/MM/DD hh:mm:ss A')} UTC**`
    )
  }
  setTimeout(start, 5000, client)
}
