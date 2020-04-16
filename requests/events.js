// const telegram = require(path.join(process.cwd(), 'node_modules','import-cwd'))('./telegram.js')

module.exports = {
  async ready (client, db) {
    const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests WHERE donator = ? AND hold = ?').get('NO', 'NO').count
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
    require('./express.js')(client, db)
  }
}