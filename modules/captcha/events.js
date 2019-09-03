let { generate } = require('captcha-generator')
let cache = {}

module.exports = {
  reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS captcha (id TEXT, guild TEXT, captcha TEXT, attempts INTEGER, joinStamp INTEGER, PRIMARY KEY(id,guild))').run()
  },
  events: {
    ready (client, db) {
      let rows = db.prepare('SELECT id,guild,joinStamp FROM captcha').all()
      rows.forEach(row => {
        let guild = client.guilds.get(row.guild)
        guild.members.fetch(row.id).then(member => {
          console.log(member)
          cache[`${member.guild.id}_${member.id}`] = setTimeout(member.kick, (30 * 60 * 1000) - (Date.now() - row.joinStamp))
        })
      })
    },
    message (client, db, moduleName, msg) {
      if (!msg.guild) {
        let rows = db.prepare('SELECT guild,captcha,attempts FROM captcha WHERE id = ?').all(msg.author.id)
        if (rows.length > 0) {
          rows.forEach(row => {
            if (row.captcha === msg.content) {
              let guild = client.guilds.get(row.guild)
              let role = guild.roles.find(r => r.name === 'Members')
              guild.members.fetch(msg.author.id).then(member => {
                clearTimeout(cache[`${guild.id}_${msg.author.id}`])
                db.prepare('DELETE FROM captcha WHERE id = ? AND guild = ?').run(msg.author.id, row.guild)
                member.roles.add(role)
              })
            } else {
              if (row.attempts === 1) {
                db.prepare('DELETE FROM captcha WHERE id = ? AND guild = ?').all(msg.author.id, row.guild)
                let guild = client.guilds.get(row.guild)

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

      let rows = db.prepare('SELECT guild,captcha FROM captcha WHERE id = ? AND guild = ?').get(member.id, member.guild.id)
      if (!rows) {
        db.prepare('INSERT INTO captcha (id,guild,captcha,attempts,joinStamp) VALUES (?,?,?,5,?)').run(member.id, member.guild.id, plaintext, member.joinedTimestamp)

        member.send({
          embed: {
            title: `Welcome to ${member.guild.name}!`,
            description: 'Please complete the captcha below to gain access to the server.\n**NOTE:** This is **Case Sensitive**.',
            fields: [{
              name: '**Why?**',
              value: 'This is to protect the server against malicious raids using automated bots.'
            }]
          },
          files: [buffer]
        })

        cache[`${member.guild.id}_${member.id}`] = setTimeout(member.kick, 30 * 60 * 1000)
      }
    }
  }
}
