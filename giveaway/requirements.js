module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS giveaway (guild TEXT, channel TEXT, code TEXT, answer INTEGER)').run()
}
