let limit = 20

module.exports.events = {
  async ready (client, db) {
    let stmt = db.prepare('SELECT user FROM requests GROUP BY user')

    let requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get().count
    let guild = client.guilds.first()
    let perms = []

    for (const row of stmt.iterate()) {
      guild.members.fetch(row.user).then(member => db.prepare('UPDATE requests SET donator=? WHERE user=?').run(member.roles.some(r => r.name === 'Donators') ? 'YES' : 'NO', row.user))
    }

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
          id: guild.roles.find(r => r.name === 'Moderators').id,
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
    console.log('here')
    guild.channels.find(c => c.name === 'requests-submission').overwritePermissions({
      permissionOverwrites: perms,
      reason: 'Submission locking/enabling Sync'
    }).catch(err => console.log(err))
  }
}
