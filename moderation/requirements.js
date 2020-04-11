const path = require('path')
const fs = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('fs-extra')
const moment = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('moment')

module.exports = async (client, db) => {
  if (!(await fs.pathExists('data/lastChallenge.txt'))) fs.writeFileSync('data/lastChallenge.txt', moment().subtract(1, 'day').utc())

  db.prepare('CREATE TABLE IF NOT EXISTS lastMessage (user TEXT, lastMessage TEXT, PRIMARY KEY (user))').run()
}
