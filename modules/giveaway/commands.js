var moment = require('moment')
const timers = {}
module.exports = {
  reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS giveaway (guild TEXT, channel TEXT, code TEXT, answer INTEGER)').run()
  },
  commands: {
    giveaway: {
      desc: 'Starts a giveaway on the current channel.',
      usage: 'giveaway',
      async execute (client, msg, param, db) {
        let check = db.prepare('SELECT * FROM giveaway WHERE guild = ? AND channel = ?').get(msg.guild.id, msg.channel.id)
        if (check) return msg.channel.send('Theres already a giveaway running on this channel')

        const dm = await msg.author.send('Send the code to giveaway here.')
        dm.channel.awaitMessages(m => true, { max: 1 })
          .then(collected => {
            const code = collected.first().content
            var answer = code.match(/\d+/)[0][0]

            check = db.prepare('SELECT * FROM giveaway WHERE guild = ? AND channel = ?').get(msg.guild.id, msg.channel.id)
            if (check) return msg.channel.send('Theres already a giveaway running on this channel')

            db.prepare('INSERT INTO giveaway (guild,channel,code,answer) VALUES (?,?,?,?)').run(msg.guild.id, msg.channel.id, code, answer)
            checkData(msg.guild.id, msg.channel.id)
            msg.channel.send(`Giveaway started! Use the command 'guess' to guess the missing number of the code.`)
          })
      }
    },
    guess: {
      desc: 'Tries a guess for a giveaway.',
      usage: 'guess [0-9]',
      async execute (client, msg, param, db) {
        const giveaway = db.prepare('SELECT * FROM giveaway WHERE guild = ? AND channel = ?').get(msg.guild.id, msg.channel.id)
        if (!giveaway) return msg.channel.send('Theres no giveaway running on this channel')

        const guess = parseInt(param[1])
        if (isNaN(guess) || guess > 9 || guess < 0) return msg.channel.send('Invalid guess. Must be a number between 0 and 9.')
        const { code, answer } = giveaway
        checkData(msg.guild.id, msg.channel.id)
        if (timers[msg.guild.id][msg.channel.id][msg.author.id]) return msg.channel.send(`Please wait ${moment().unix() + 10 - timers[msg.guild.id][msg.channel.id][msg.author.id]} before doing another guess.`)
        if (answer === guess) {
          db.prepare('DELETE FROM giveaway WHERE guild = ? AND channel = ? AND code = ? AND answer = ?').run(msg.guild.id, msg.channel.id, code, guess)
          msg.channel.send(`Congratulations ${msg.author}! Your code was sent throught DMs.`)
          msg.author.send(code)
        } else {
          msg.channel.send('Try again.')
          timers[msg.guild.id][msg.channel.id][msg.author.id] = moment().unix()
          setTimeout(function (guild, channel, author) {
            delete timers[guild][channel][author]
          }, 10 * 1000, msg.guild.id, msg.channel.id, msg.author.id)
        }
      }
    }
  }
}

function checkData (guild, channel) {
  if (!timers[guild]) timers[guild] = {}
  if (!timers[guild][channel]) timers[guild][channel] = {}
}
