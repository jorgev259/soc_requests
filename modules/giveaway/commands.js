module.exports = {
  reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS giveaway (guild TEXT, channel TEXT, code TEXT, hint INTEGER)').run()
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
            var match = code.match(/\d+/)
            console.log(code)
            console.log(match)
            const hint = code
            hint[match] = '?'

            check = db.prepare('SELECT * FROM giveaway WHERE guild = ? AND channel = ?').get(msg.guild.id, msg.channel.id)
            if (check) return msg.channel.send('Theres already a giveaway running on this channel')

            db.prepare('INSERT INTO giveaway (guild,channel,code,hint) VALUES (?,?,?,?)').run(msg.guild.id, msg.channel.id, code, match)
            msg.channel.send(`Giveaway started! Use the command 'guess' to try the missing number of this code.\n${hint}`)
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
        const { code, hint } = giveaway
        console.log(guess)
        console.log(parseInt(code.charAt(hint)))
        if (parseInt(code.charAt(hint)) === guess) {
          db.prepare('DELETE FROM giveaway WHERE guild = ? AND channel = ? AND code = ? AND hint = ?').run(msg.guild.id, msg.channel.id, code, guess)
          msg.channel.send(`Congratulations ${msg.author}! Your code was sent throught DMs.`)
          msg.author.send(code)
        } else msg.channel.send('Try again.')
      }
    }
  }
}
