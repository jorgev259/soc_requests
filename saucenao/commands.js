module.exports = {
  enablesauce: {
    desc: 'Enables saucebot on the current channel',
    help: '>enablesauce',
    async execute (client, msg, param, db) {
      db.prepare('INSERT OR IGNORE INTO saucenao (guild,channel) VALUES (?,?)').run(msg.guild.id, msg.channel.id)
      msg.channel.send('Saucenao enabled on this channel')
    }
  },
  disablesauce: {
    desc: 'Disables saucebot on the current channel',
    help: '>disablesauce',
    async execute (client, msg, param, db) {
      db.prepare('DELETE FROM saucenao WHERE guild = ? AND channel = ?').run(msg.guild.id, msg.channel.id)
      msg.channel.send('Saucenao disabled from this channel')
    }
  }
}
