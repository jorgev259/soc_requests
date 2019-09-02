let { generate } = require('captcha-generator')

module.exports = {
  reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS captcha (id TEXT, guild TEXT, captcha TEXT, PRIMARY KEY(id,guild))').run()
  },
  events: {
    message (client, db, msg) {
      if (!msg.guild) {
        let rows = db.prepare('SELECT guild,captcha FROM captcha WHERE id = ?').all(msg.author.id)
        if (rows.length > 0) {
          rows.forEach(row => {
            if (row.captcha === msg.content) {
              let guild = client.guilds.get(row.guild)
              let role = guild.roles.find(r => r.name === 'Members')
              guild.members.fetch(msg.author.id).then(member => {
                db.prepare('SELECT guild,captcha FROM captcha WHERE id = ? AND guild = ?').all(msg.author.id, row.guild)
                member.roles.add(role)
              })
            } else {
              msg.author.send('Wrong captcha')
            }
          })
        }
      }
    },
    guildMemberAdd (client, db, member) {
      const cimg = generate()
      const { plaintext, buffer } = cimg
      console.log(plaintext)
      console.log(member.id)
      console.log(member.guild)
      db.prepare('INSERT INTO captcha (id,guild,captcha) VALUES (?,?,?)').run(member.id, member.guild.id, plaintext)

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
    }
  }
}
