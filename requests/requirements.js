module.exports = (client, db) => {
  db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, timestamp DATETIME)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS telegram_chats (id TEXT PRIMARY KEY)').run()
  db.prepare('CREATE TABLE IF NOT EXISTS vgmdb_url (url TEXT)').run()
}
