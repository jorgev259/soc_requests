module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS rss (id TEXT, url TEXT, PRIMARY KEY (url,id))').run()
}
