const path = require('path')
const fs = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('fs-extra')
const moment = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('moment')

module.exports = {
  async ready (client, db) {
    const lastChallenge = moment(fs.readFileSync('data/lastChallenge.txt', 'utf8'), 'DD/MM/YYYY').utc()

    const guild = client.guilds.cache.first()
    const members = await guild.members.fetch()
    members.forEach(member => {
      db.prepare('INSERT OR IGNORE INTO lastMessage (user, lastMessage) VALUES (?, ?)').run(member.id, moment().utc().format())
    })

    if (moment().isSame(lastChallenge, 'day')) {
      const nextChallenge = lastChallenge.add(1, 'day').hour(12).minute(0)
      console.log(`Scheduling next inactivity check ${nextChallenge}`)
      setTimeout(send, moment(nextChallenge).diff(moment().utc()), client, db)
    } else {
      console.log('Inactivity check in progress. Sending redguards...')
      send(client, db)
    }
  },
  async message (client, db, moduleName, msg) {
    db.prepare('UPDATE lastMessage set lastMessage = ? WHERE user =?').run(moment().utc().format(), msg.author.id)
  },
  async guildMemberAdd (client, db, moduleName, member) {
    db.prepare('INSERT OR IGNORE INTO lastMessage (user, lastMessage) VALUES (?, ?)').run(member.id, moment().utc().format())
  }
}

function send (client, db) {
  const guild = client.guilds.cache.first()
  const today = moment().utc()
  guild.members.fetch().then(members => {
    members.forEach(member => {
      const diff = moment().utc().diff(db.prepare('SELECT lastMessage FROM lastMessage WHERE user=?').get(member.id).lastMessage)
      if (diff >= 60 * 24 * 60 * 60 * 1000) {
        console.log(`${member.user.tag}: ${diff / 1000 / 60 / 60 / 24} days inactive`)
        member.send('Youve been kicked from sittingonclouds.net for being inactive.').finally(() => {
          member.kick('Inactivity')
        })
      }
    })
  })

  fs.writeFileSync('data/lastChallenge.txt', today.format('DD/MM/YYYY'))
  const nextChallenge = today.add(1, 'day').hour(12).minute(0)

  console.log(`Scheduling next inactivity check to ${nextChallenge}`)
  setTimeout(send, moment(nextChallenge).diff(moment().utc()), client, db)
}
