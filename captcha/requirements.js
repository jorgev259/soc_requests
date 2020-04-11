module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS captcha (id TEXT, guild TEXT, captcha TEXT, attempts INTEGER, joinStamp INTEGER, PRIMARY KEY(id,guild))').run()
}
