const { generate } = require('captcha-generator')
const cache = {}

module.exports = {
  reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS captcha (id TEXT, guild TEXT, captcha TEXT, attempts INTEGER, joinStamp INTEGER, PRIMARY KEY(id,guild))').run()
  },
  events: {
    ready (client, db) {
      const rows = db.prepare('SELECT id,guild,joinStamp FROM captcha').all()
      rows.forEach(row => {
        const guild = client.guilds.cache.get(row.guild)
        guild.members.fetch(row.id).then(member => {
          // cache[`${member.guild.id}_${member.id}`] = setTimeout(member.kick, (30 * 60 * 1000) - (Date.now() - row.joinStamp))
        })
      })
    },
    message (client, db, moduleName, msg) {
      if (!msg.guild) {
        const rows = db.prepare('SELECT guild,captcha,attempts FROM captcha WHERE id = ?').all(msg.author.id)
        if (rows.length > 0) {
          rows.forEach(row => {
            if (msg.content.toLowerCase() === 'reroll') {
              const guild = client.guilds.cache.get(row.guild)
              guild.members.fetch(msg.author.id).then(member => {
                const cimg = generate()
                const { plaintext, buffer } = cimg

                db.prepare('UPDATE captcha SET captcha = ? AND attempts = 5 WHERE id=? AND guild =?').run(plaintext, member.id, member.guild.id)
                member.send({
                  files: [buffer]
                })
              })
            } else if (row.captcha === msg.content) {
              const guild = client.guilds.cache.get(row.guild)
              const role = guild.roles.find(r => r.name === 'Members')
              guild.members.fetch(msg.author.id).then(member => {
                clearTimeout(cache[`${guild.id}_${msg.author.id}`])
                db.prepare('DELETE FROM captcha WHERE id = ? AND guild = ?').run(msg.author.id, row.guild)
                member.roles.add(role)
              })
            } else {
              if (row.attempts === 1) {
                db.prepare('DELETE FROM captcha WHERE id = ? AND guild = ?').all(msg.author.id, row.guild)
                const guild = client.guilds.cache.get(row.guild)

                msg.author.send('Too many failed attempts.')
                guild.members.fetch(msg.author.id).then(member => member.kick())

                clearTimeout(cache[`${guild.id}_${msg.author.id}`])
              } else {
                db.prepare('UPDATE captcha SET attempts = attempts - 1 WHERE id = ? AND guild = ?')
                msg.author.send(`Wrong captcha. Attempts left: ${row.attempts - 1}`)
              }
            }
          })
        }
      }
    },
    guildMemberAdd (client, db, moduleName, member) {
      const cimg = generate()
      const { plaintext, buffer } = cimg

      const rows = db.prepare('SELECT guild,captcha FROM captcha WHERE id = ? AND guild = ?').get(member.id, member.guild.id)
      if (!rows) {
        db.prepare('INSERT INTO captcha (id,guild,captcha,attempts,joinStamp) VALUES (?,?,?,5,?)').run(member.id, member.guild.id, plaintext, member.joinedTimestamp)

        member.send({
          embed: {
            title: `Welcome to ${member.guild.name}!`,
            description: 'Please complete the captcha below to gain access to the server.\nYou can request a different captcha by typing \'reroll\' here.\n**NOTE:** This is **Case Sensitive**.\nIn case of having issues, ask for support on #verification.',
            fields: [{
              name: '**Why?**',
              value: 'This is to protect the server against malicious raids using automated bots.'
            }]
          },
          files: [buffer]
        })

        // cache[`${member.guild.id}_${member.id}`] = setTimeout(member.kick, 30 * 60 * 1000)
      }
    }
  }
}
