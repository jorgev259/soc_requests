module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS requests (user TEXT, request TEXT, msg TEXT, donator TEXT, hold INTEGER DEFAULT \'NO\', id INTEGER PRIMARY KEY AUTOINCREMENT)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, reason TEXT, timestamp DATETIME)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS telegram_chats (id TEXT PRIMARY KEY)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS bitly (url TEXT PRIMARY KEY)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS vgmdb_url (url TEXT, request TEXT)').run()

  client.config.requests.requestCount = db.prepare('SELECT COUNT(*) as count FROM requests WHERE donator = ? AND hold = ?').get('NO', 'NO').count
  if (client.config.requests.requestCount >= client.config.requests.limit.count) client.config.requests.locked = true
}
