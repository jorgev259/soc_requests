const fs = require('fs-extra')
let moment = require('moment')

let lastChallenge

module.exports = {
  async reqs (client, db) {
    if (!(await fs.pathExists('data/lastChallenge.txt'))) fs.writeFileSync('data/lastChallenge.txt', moment().subtract(1, 'day').utc())
    lastChallenge = moment(fs.readFileSync('data/lastChallenge.txt', 'utf8'), 'DD/MM/YYYY').utc()

    db.prepare('CREATE TABLE IF NOT EXISTS lastMessage (user TEXT, lastMessage TEXT, PRIMARY KEY (user))').run()
  },
  events: {
    async ready (client, db) {
      let guild = client.guilds.first()
      let members = await guild.members.fetch()
      members.forEach(member => {
        db.prepare('INSERT OR IGNORE INTO lastMessage (user, lastMessage) VALUES (?, ?)').run(member.id, moment().utc().format())
      })

      if (moment().isSame(lastChallenge, 'day')) {
        let nextChallenge = lastChallenge.add(1, 'day').hour(12).minute(0)
        console.log(`Scheduling next inactivity check ${nextChallenge}`)
        setTimeout(send, moment(nextChallenge).diff(moment().utc()), client, db)
      } else {
        console.log('Inactivity check in progress. Sending redguards...')
        send(client, db)
      }
    },
    async message (client, db, moduleName, msg) {
      db.prepare('UPDATE lastMessage set lastMessage = ? WHERE user =?').run(moment().utc().format(), msg.author.id)
    }
  }
}

function send (client, db) {
  let guild = client.guilds.first()
  let today = moment().utc()
  guild.members.fetch().then(members => {
    members.forEach(member => {
      console.log(member.id)
      console.log(db.prepare('SELECT lastMessage FROM lastMessage WHERE user=?').get(member.id))
      let diff = moment().utc().diff(db.prepare('SELECT lastMessage FROM lastMessage WHERE user=?').get(member.id).lastMessage)
      /* console.log(`${member.user.tag}: ${diff / 1000 / 60 / 60 / 24} days inactive`)
      if (diff >= 60 * 24 * 60 * 60 * 1000) {
        member.send('Youve been kicked from sittingonclouds.net for being inactive.').finally(() => {
          member.kick('Inactivity')
        })
      } */
    })
  })

  fs.writeFileSync('data/lastChallenge.txt', today.format('DD/MM/YYYY'))
  let nextChallenge = today.add(1, 'day').hour(12).minute(0)

  console.log(`Scheduling next inactivity check to ${nextChallenge}`)
  setTimeout(send, moment(nextChallenge).diff(moment().utc()), client, db)
}
