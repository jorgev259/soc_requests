const limit = 20
const telegram = require('./telegram.js')

module.exports.events = {
  async ready (client, db) {
    const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests WHERE donator = ? AND hold = ?').get('NO', 'NO').count
    const guild = client.guilds.first()
    let perms = []

    if (requestCount >= limit) {
      perms = [
        {
          id: guild.roles.find(r => r.name === 'BOTs').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.find(r => r.name === 'Donators').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.find(r => r.name === 'Technicans').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.roles.find(r => r.name === 'Owner').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: guild.id,
          deny: ['SEND_MESSAGES'],
          allow: ['VIEW_CHANNEL']
        }
      ]
    } else if (requestCount < limit) {
      perms = [
        {
          id: guild.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        }
      ]
    }

    guild.channels.find(c => c.name === 'requests-submission').overwritePermissions({
      permissionOverwrites: perms,
      reason: 'Submission locking/enabling Sync'
    }).catch(err => console.log(err))

    telegram.login(client, db)
    require('./express.js')(client)
  }
}
