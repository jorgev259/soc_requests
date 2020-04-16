/* eslint-disable no-async-promise-executor */
const path = require('path')
const { get } = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('axios')

const { GoogleSpreadsheet } = require('google-spreadsheet')
const doc = new GoogleSpreadsheet('1D7X2YXffGGeLUKM9D_Q0lypuKisDuXsb3Yyj-cySiHQ')

module.exports = {
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

      if (!req) return msg.channel.send('Request not found.')
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
          const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
          msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: ON HOLD by ${msg.author}\nReason: ${reason}`)

          talkChannel.send(`The request ${req.request} from <@${req.user}> has put ON HOLD.\nReason: ${reason}`)

          lock(client, msg, -1)
        })
        .catch(err => catchErr(msg, err))
    }
  },

  request: {
    desc: 'Request a soundtrack',
    usage: 'request [url or name]',
    async execute (client, msg, param, db) {
      const { requestCount } = client.config.requests
      const limit = client.config.requests.limit.count
      if (!param[1]) return msg.channel.send('Please provide a url or name')

      const req = db.prepare('SELECT request FROM requests WHERE user=? AND hold=?').get(msg.author.id, 'NO')
      const donator = msg.member.roles.cache.some(r => r.name === 'Donators')
      const owner = msg.member.roles.cache.some(r => r.name === 'Owner')

      const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
      if (!(donator || owner) && req) return talkChannel.send(`The request '${req.request}' is still on place. Wait until its fulfilled or rejected.`)
      if (!(donator || owner) && requestCount >= limit) return msg.channel.send('There are too many open requests right now. Wait until slots are opened.')
      const name = param.slice(1).join(' ')

      const filterUrls = param.filter(e => e.includes('vgmdb.net'))
      if (filterUrls.length > 1) return msg.channel.send('You can only specify one url per request.')

      const info = {
        request: name,
        user: msg.author.id,
        donator: donator
      }
      if (filterUrls.length > 0) {
        const row = db.prepare('SELECT * FROM vgmdb_url WHERE url = ?').all(filterUrls[0])
        if (row.length > 0) return talkChannel.send(`This soundtrack has already been requested (${filterUrls[0]})`)
        info.vgmdb = filterUrls[0].replace('vgmdb.net', 'vgmdb.info')
      }

      db.prepare('INSERT INTO requests (user,request,msg,donator) VALUES (?,?,?,?)').run(msg.author.id, info.request, 'PENDING', donator ? 'YES' : 'NO')
      const { id } = db.prepare('SELECT id FROM requests WHERE user=? AND request=? AND msg=?').get(msg.author.id, info.request, 'PENDING')

      info.id = id
      sendEmbed(msg, db, info)
        .then(async () => {
          msg.channel.send('Request submitted.')
          lock(client, msg, donator ? 0 : 1)

          await doc.loadInfo()
          const sheet = doc.sheetsByIndex[0]
          sheet.addRow([info.id, info.name || info.request, msg.author.tag, info.user, info.vgmdb || ''])
        })
        .catch(err => catchErr(msg, err))
    }
  },

  pending: {
    desc: 'Shows how many pending requests you have.',
    async execute (client, msg, param, db) {
      let id = 0
      if (msg.mentions.users.size > 0 && !msg.member.roles.cache.some(r => r.name === 'Mods/News')) return msg.channel.send('Forbidden')
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

      if (!req) return msg.channel.send('Request not found.')

      db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'YES\',?,datetime(\'now\'))').run(req.user, req.request, param[2] || 'NONE')
      db.prepare('DELETE FROM requests WHERE id=?').run(param[1])
      lock(client, msg, req.donator === 'YES' || req.hold === 'YES' ? 0 : -1)

      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
        await m.delete()
        msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Completed by ${msg.author}`)
        msg.guild.channels.cache.find(c => c.name === 'last-added-soundtracks').send(`<@${req.user}`).then(m2 => m2.delete())
        const dm = await msg.guild.members.fetch(req.user)
        dm.send(`Your request '${req.request}' has been uploaded!`).catch(e => {
          msg.guild.channels.cache.find(c => c.name === 'last-added-soundtracks').send(`<@${req.user}>`).then(m2 => m2.delete())
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

      if (!req) return msg.channel.send('Request not found.')

      const reason = param.slice(2).join(' ')

      db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'NO\',?,datetime(\'now\'))').run(req.user, req.request, reason)
      db.prepare('DELETE FROM requests WHERE id=?').run(param[1])
      db.prepare('DELETE FROM vgmdb_url WHERE request=?').run(param[1])
      lock(client, msg, req.donator === 'YES' || req.hold === 'YES' ? 0 : -1)

      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
        await m.delete()
        msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Rejected by ${msg.author}\nReason: ${reason}`)
        const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
        talkChannel.send(`The request ${req.request} from <@${req.user}> has been rejected.\nReason: ${reason}`)
      })
    }
  }
}

function sendEmbed (msg, db, info) {
  return new Promise(async (resolve, reject) => {
    if (info.oldMessage) {
      try {
        const oldMessage = await msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(info.oldMessage)
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
        const vgmdbUrl = `https://vgmdb.net/${data.link}`
        info.name = data.name
        const newRequest = `${data.name} (${vgmdbUrl})${info.hold ? ' **(ON HOLD)**' : ''}`
        embed.fields[0].value = newRequest
        db.prepare('INSERT INTO vgmdb_url (url,request) VALUES (?,?)').run(vgmdbUrl, info.id)
        db.prepare('UPDATE requests SET request = ? WHERE id=?').run(newRequest, info.id)
      }
    } finally {
      msg.guild.channels.cache.find(c => c.name === 'open-requests').send({ embed })
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
      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(info.msg).then(m => {
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

function lock (client, msg, ammount) {
  const limit = client.config.requests.limit.count
  const channel = msg.guild.channels.cache.find(c => c.name === 'requests-submission')
  client.config.requests.requestCount += ammount

  if (client.config.requests.requestCount >= limit && !client.config.requests.locked) {
    channel.send('No more requests allowed')
    channel.overwritePermissions([
      {
        id: msg.guild.roles.cache.find(r => r.name === 'BOTs').id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      },
      {
        id: msg.guild.roles.cache.find(r => r.name === 'Donators').id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      },
      {
        id: msg.guild.roles.cache.find(r => r.name === 'Technicans').id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      },
      {
        id: msg.guild.roles.cache.find(r => r.name === 'Owner').id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      },
      {
        id: msg.guild.id,
        deny: ['SEND_MESSAGES'],
        allow: ['VIEW_CHANNEL']
      }
    ], 'Submission locking'
    ).then(() => { client.config.requests.locked = true })
  } else if (client.config.requests.requestCount === limit - 1 && client.config.requests.locked) {
    channel.send('Requests open')
    channel.overwritePermissions([
      {
        id: msg.guild.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      }
    ], 'Submission enabling'
    ).then(() => { client.config.requests.locked = false })
  }
}
