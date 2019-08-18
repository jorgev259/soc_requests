const Telegraf = require('telegraf')

let bot = null

module.exports = {
  login (client, db) {
    bot = new Telegraf(client.data.tokens.telegram)
    bot.command('enable', (ctx) => {
      const req = db.prepare('SELECT id FROM telegram_chats WHERE id=?').get(ctx.chat.id)
      if (req) return ctx.reply('Already enabled!')
      else {
        db.prepare('INSERT INTO telegram_chats (id) VALUES (?)').run(ctx.chat.id)
        ctx.reply('Woomy! This chat will receive all updates from sittingonclouds.net')
      }
    })
    bot.launch()
  },
  sendUpdate (link, db) {
    const ids = db.prepare('SELECT id FROM telegram_chats').all()
    ids.forEach(row => bot.telegram.sendMessage(link, row.id))
  }
}
