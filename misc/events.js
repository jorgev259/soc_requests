module.exports = {
  ready (client, db) {
    client.guilds.cache.forEach(guild => {
      if (db.prepare('SELECT guild FROM activity WHERE guild=? LIMIT 1').all(guild.id).length === 0) {
        guild.channels.cache.forEach(channel => {
          if (channel.type === 'text') {
            channel.messages.fetch().then(messages => {
              messages.forEach(msg => {
                db.prepare('INSERT OR IGNORE INTO activity (guild,user,activity) VALUES (?,?,0)').run(msg.guild.id, msg.author.id)
                db.prepare('UPDATE activity set activity = activity + 1 WHERE user =? AND guild=?').run(msg.author.id, msg.guild.id)
              })
            })
          }
        })
      }
    })
  },
  async message (client, db, moduleName, msg) {
    if (!msg.member) return
    db.prepare('INSERT OR IGNORE INTO activity (guild,user,activity) VALUES (?,?,0)').run(msg.guild.id, msg.author.id)
    db.prepare('UPDATE activity set activity = activity + 1 WHERE user =? AND guild=?').run(msg.author.id, msg.guild.id)
  }
}
