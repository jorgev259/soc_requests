const Telegraf = require('telegraf')

let telegram = null

module.exports = {
  login (client) {
    console.log(client.data.tokens.telegram)
    telegram = new Telegraf(client.data.tokens.telegram)
    telegram.command('enable', (ctx) => ctx.reply('Hello'))
    telegram.launch()
  },
  sendUpdate () {

  }
}
