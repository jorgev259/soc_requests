// const telegram = require(path.join(process.cwd(), 'node_modules','import-cwd'))('./telegram.js')
const { GoogleSpreadsheet } = global.requireFn('google-spreadsheet')
const doc = new GoogleSpreadsheet('1D7X2YXffGGeLUKM9D_Q0lypuKisDuXsb3Yyj-cySiHQ')

module.exports = {
  async ready (client, db) {
    doc.useServiceAccountAuth(client.config.requests.limit.google)
    await doc.loadInfo()

    const requests = doc.sheetsByIndex[0]
    const requestRows = (await requests.getRows()).map(e => e.ID)
    const donators = (await doc.sheetsByIndex[1].getRows()).map(e => e.ID)
    const hold = (await doc.sheetsByIndex[2].getRows()).map(e => e.ID)
    const complete = (await doc.sheetsByIndex[3].getRows()).map(e => e.ID)

    client.config.requests.currentID = Math.max(...[...requestRows, ...donators, ...hold, ...complete])

    const requestCount = requests.rowCount - 1
    const guild = client.guilds.cache.first()

    let perms = []

    if (requestCount >= client.config.requests.limit.count) {
      perms = [
        {
          id: guild.roles.cache.find(r => r.name === 'BOTs').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.cache.find(r => r.name === 'Donators').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.cache.find(r => r.name === 'Technicans').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.cache.find(r => r.name === 'Owner').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.id,
          deny: ['SEND_MESSAGES'],
          allow: ['VIEW_CHANNEL']
        }
      ]
    } else if (requestCount < client.config.requests.limit.count) {
      perms = [
        {
          id: guild.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        }
      ]
    }

    guild.channels.cache.find(c => c.name === 'requests-submission')
      .overwritePermissions(perms, 'Submission locking/enabling Sync')
      .catch(err => console.log(err))

    // telegram.login(client, db)
  }
}
