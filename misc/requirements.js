module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS activity (guild TEXT, user TEXT, activity INTEGER, PRIMARY KEY (guild,user))').run()
}
