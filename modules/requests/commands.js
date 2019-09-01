let requestCount = 0
const limit = 20
const { get } = require('axios')

let locked = false

module.exports = {
  async reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS requests (user TEXT, request TEXT, msg TEXT, donator TEXT, hold INTEGER DEFAULT \'NO\', id INTEGER PRIMARY KEY AUTOINCREMENT)').run()
    db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, reason TEXT, timestamp DATETIME)').run()
    db.prepare('CREATE TABLE IF NOT EXISTS telegram_chats (id TEXT PRIMARY KEY)').run()
    db.prepare('CREATE TABLE IF NOT EXISTS bitly (url TEXT PRIMARY KEY)').run()
    requestCount = db.prepare('SELECT COUNT(*) as count FROM requests WHERE donator = ? AND hold = ?').get('NO', 'NO').count
    if (requestCount >= limit) locked = true
  },
  commands: {
    refresh: {
      desc: 'Reposts all open requests.',
      usage: 'refresh',
      async execute (client, msg, param, db) {
        const ids = db.prepare('SELECT id FROM requests ORDER BY id ASC').all().map(e => e.id)
        runId(ids)

        function runId (ids) {
          if (!ids[0]) return
          const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(ids[0])

          const info = {
            request: row.request,
            user: row.user,
            id: row.id,
            hold: row.hold === 'YES',
            donator: row.donator === 'YES',
            oldMessage: row.msg
          }
          const filterUrls = row.request.split(' ').filter(e => e.includes('vgmdb.net'))

          if (filterUrls.length > 0) info.vgmdb = filterUrls[0].replace('vgmdb.net', 'vgmdb.info').replace('(', '').replace(')', '')
          sendEmbed(msg, db, info)
            .then(() => {
              ids.shift()
              runId(ids)
            })
        }
      }
    },

    hold: {
      desc: 'Marks a request as ON HOLD.',
      usage: 'hold [id] [reason]',
      async execute (client, msg, param, db) {
        if (!param[2]) return msg.channel.send('Incomplete command.')

        const req = db.prepare('SELECT request,msg,user,donator,hold,id FROM requests WHERE id=?').get(param[1])
        if (req.donator === 'YES') return msg.channel.send('Donator requests cannot be put on hold.')

        if (!req) return msg.channel.send(`Request not found.`)
        const reason = param.slice(2).join(' ')

        const info = {
          request: req.request,
          user: req.user,
          donator: req.donator,
          hold: true,
          id: req.id,
          msg: req.msg
        }

        db.prepare('UPDATE requests SET hold = ? WHERE id=?').run('YES', info.id)

        editEmbed(msg, db, info)
          .then(() => {
            msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: ON HOLD by ${msg.author}\nReason: ${reason}`)

            msg.guild.channels.find(c => c.name === 'requests-submission').send(`The request ${req.request} from <@${req.user}> has put ON HOLD.\nReason: ${reason}`)

            lock(msg, -1)
          })
          .catch(err => catchErr(msg, err))
      }
    },

    request: {
      desc: 'Request a soundtrack',
      usage: 'request [url or name]',
      async execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or name')

        const req = db.prepare('SELECT request FROM requests WHERE user=? AND hold=?').get(msg.author.id, 'NO')
        const donator = msg.member.roles.some(r => r.name === 'Donators')
        const owner = msg.member.roles.some(r => r.name === 'Owner')
        if (!(donator || owner) && req) return msg.channel.send(`The request '${req.request}' is still on place. Wait until its fulfilled or rejected.`)
        if (!(donator || owner) && requestCount >= limit) return msg.channel.send('There are too many open requests right now. Wait until slots are opened.')
        const name = param.slice(1).join(' ')

        const filterUrls = param.filter(e => e.includes('vgmdb.net'))
        if (filterUrls.length > 1) return msg.channel.send('You can only specify one url per request.')

        const info = {
          request: name,
          user: msg.author.id,
          donator: donator
        }
        if (filterUrls.length > 0) info.vgmdb = filterUrls[0].replace('vgmdb.net', 'vgmdb.info')
        submit(msg, db, info)
      }
    },

    pending: {
      desc: 'Shows how many pending requests you have.',
      async execute (client, msg, param, db) {
        let id = 0
        if (msg.mentions.users.size > 0 && !msg.member.roles.some(r => r.name === 'Mods/News')) return msg.channel.send('Forbidden')
        else if (msg.mentions.users.size > 0) id = msg.mentions.users.first().id
        else id = msg.author.id

        const { count } = db.prepare('SELECT COUNT(*) as count FROM requests WHERE user=? AND hold=?').get(id, 'NO')
        const { countHold } = db.prepare('SELECT COUNT(*) as countHold FROM requests WHERE user=? AND hold=?').get(id, 'YES')
        msg.channel.send(`${id === msg.author.id ? 'Pending' : `${msg.mentions.users.first().tag}'s pending`} requests: ${count}\n` +
                         `${id === msg.author.id ? 'On Hold' : `${msg.mentions.users.first().tag}'s on hold`} requests: ${countHold}`)
      }
    },

    complete: {
      desc: 'Marks a request as completed.',
      usage: 'complete [id]',
      async execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Incomplete command.')

        const req = db.prepare('SELECT request,msg,user,donator,hold FROM requests WHERE id=?').get(param[1])

        if (!req) return msg.channel.send(`Request not found.`)

        db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'YES\',?,datetime(\'now\'))').run(req.user, req.request, param[2] || 'NONE')
        db.prepare('DELETE FROM requests WHERE id=?').run(param[1])
        lock(msg, req.donator === 'YES' || req.hold === 'YES' ? 0 : -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Completed by ${msg.author}`)
          msg.guild.channels.find(c => c.name === 'last-added-soundtracks').send(`<@${req.user}`).then(m2 => m2.delete())
          const dm = await msg.guild.members.fetch(req.user)
          dm.send(`Your request '${req.request}' has been uploaded!`).catch(e => {
            msg.guild.channels.find(c => c.name === 'last-added-soundtracks').send(`<@${req.user}>`).then(m2 => m2.delete())
          })
        })
      }
    },

    reject: {
      desc: 'Marks a request as rejected',
      usage: 'reject [id] [reason]',
      async execute (client, msg, param, db) {
        if (!param[2]) return msg.channel.send('Incomplete command.')

        const req = db.prepare('SELECT request,msg,user,donator,hold FROM requests WHERE id=?').get(param[1])

        if (!req) return msg.channel.send(`Request not found.`)

        const reason = param.slice(2).join(' ')

        db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'NO\',?,datetime(\'now\'))').run(req.user, req.request, reason)
        db.prepare('DELETE FROM requests WHERE id=?').run(param[1])
        lock(msg, req.donator === 'YES' || req.hold === 'YES' ? 0 : -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Rejected by ${msg.author}\nReason: ${reason}`)

          msg.guild.channels.find(c => c.name === 'requests-submission').send(`The request ${req.request} from <@${req.user}> has been rejected.\nReason: ${reason}`)
        })
      }
    }
  }
}

function submit (msg, db, info) {
  const donator = msg.member.roles.some(r => r.name === 'Donators')
  db.prepare('INSERT INTO requests (user,request,msg,donator) VALUES (?,?,?,?)').run(msg.author.id, info.request, 'PENDING', donator ? 'YES' : 'NO')
  const { id } = db.prepare('SELECT id FROM requests WHERE user=? AND request=? AND msg=?').get(msg.author.id, info.request, 'PENDING')

  info.id = id
  sendEmbed(msg, db, info)
    .then(() => {
      msg.channel.send('Request submitted.')

      lock(msg, donator ? 0 : 1)
    })
    .catch(err => catchErr(msg, err))
}

function sendEmbed (msg, db, info) {
  return new Promise(async (resolve, reject) => {
    if (info.oldMessage) {
      try {
        const oldMessage = await msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(info.oldMessage)
        oldMessage.delete()
        console.log('Message deleted')
      } catch (err) {
        console.log('Couldnt delete message')
      }
    }
    const embed = {
      fields: [
        {
          name: 'Request',
          value: `${info.request}${info.hold ? ' **(ON HOLD)**' : ''}`
        },
        {
          name: 'Requested by',
          value: `<@${info.user}> / ${info.user}`,
          inline: true
        },
        {
          name: 'ID',
          value: info.id,
          inline: true
        }
      ],
      color: info.donator ? 0xedcd40 : 0x42bfed
    }

    try {
      if (info.vgmdb) {
        const { data } = await get(info.vgmdb.replace('vgmdb.net', 'vgmdb.info'))

        embed.image = { url: data.picture_small }
        const newRequest = `${data.name} (https://vgmdb.net/${data.link})${info.hold ? ' **(ON HOLD)**' : ''}`
        embed.fields[0].value = newRequest
        db.prepare('UPDATE requests SET request = ? WHERE id=?').run(newRequest, info.id)
      }
    } finally {
      msg.guild.channels.find(c => c.name === 'open-requests').send({ embed })
        .then(m => {
          db.prepare('UPDATE requests SET msg = ? WHERE id=?').run(m.id, info.id)
          resolve()
        })
    }
  })
}

function editEmbed (msg, db, info) {
  return new Promise(async (resolve, reject) => {
    const embed = {
      fields: [
        {
          name: 'Request',
          value: `${info.request}${info.hold ? ' **(ON HOLD)**' : ''}`
        },
        {
          name: 'Requested by',
          value: `<@${info.user}> / ${info.user}`,
          inline: true
        },
        {
          name: 'ID',
          value: info.id,
          inline: true
        }
      ],
      color: info.donator ? 0xedcd40 : 0x42bfed
    }

    try {
      if (info.vgmdb) {
        const { data } = await get(info.vgmdb.replace('vgmdb.net', 'vgmdb.info'))

        embed.image = { url: data.picture_small }
        const newRequest = `${data.name} (https://vgmdb.net/${data.link})${info.hold ? ' **(ON HOLD)**' : ''}`
        embed.fields[0].value = newRequest
        db.prepare('UPDATE requests SET request = ? WHERE id=?').run(newRequest, info.id)
      }
    } finally {
      msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(info.msg).then(m => {
        m.edit({ embed })
          .then(m => {
            resolve()
          })
      })
    }
  })
}

function catchErr (msg, err) {
  console.log(err)
  msg.channel.send('Something went wrong.')
}

function lock (msg, ammount) {
  const channel = msg.guild.channels.find(c => c.name === 'requests-submission')
  requestCount += ammount

  if (requestCount >= limit && !locked) {
    channel.send('No more requests allowed')
    channel.overwritePermissions({
      permissionOverwrites: [
        {
          id: msg.guild.roles.find(r => r.name === 'BOTs').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: msg.guild.roles.find(r => r.name === 'Donators').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: msg.guild.roles.find(r => r.name === 'Technicans').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: msg.guild.roles.find(r => r.name === 'Owner').id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        },
        {
          id: msg.guild.id,
          deny: ['SEND_MESSAGES'],
          allow: ['VIEW_CHANNEL']
        }
      ],
      reason: 'Submission locking'
    }).then(() => { locked = true })
  } else if (requestCount === limit - 1 && locked) {
    channel.send('Requests open')
    channel.overwritePermissions({
      permissionOverwrites: [
        {
          id: msg.guild.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        }
      ],
      reason: 'Submission enabling'
    }).then(() => { locked = false })
  }
}
