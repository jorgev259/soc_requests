const Telegraf = require('telegraf')

let telegram = null

module.exports = {
  login (client, db) {
    telegram = new Telegraf(client.data.tokens.telegram)
    telegram.command('enable', (ctx) => {
      const req = db.prepare('SELECT id FROM telegram_chats WHERE id=?').get(ctx.chat.id)
      if (req) return ctx.reply('Already enabled!')
      else {
        db.prepare('INSERT INTO telegram_chats (id) VALUES (?)').run(ctx.chat.id)
        ctx.reply('Woomy! This chat will receive all updates from sittingonclouds.net')
      }
    })
    telegram.launch()
  },
  sendUpdate (link, db) {
    const ids = db.prepare('SELECT id FROM telegram_chats').all()
    ids.forEach(row => telegram.sendMessage(link, row.id))
  }
}
