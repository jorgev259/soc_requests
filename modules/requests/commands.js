let requestCount = 0
let limit = 20
const { get } = require('axios')

let locked = false

module.exports = {
  async reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS requests (user TEXT, request TEXT, msg TEXT, PRIMARY KEY (user))').run()
    db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, reason TEXT, timestamp DATETIME)').run()
    requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get().count
    if (requestCount >= limit) locked = true
  },
  commands: {
    request: {
      desc: 'Request a soundtrack',
      usage: '>request [url or name]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or name')

        let req = db.prepare('SELECT request FROM requests WHERE user=?').get(msg.author.id)
        if (!msg.member.roles.some(r => r.name === 'Donators' || r.name === 'Owner') && req) return msg.channel.send(`The request '${req.request}' is still on place. Wait until its fulfilled or rejected.`)
        if (!msg.member.roles.some(r => r.name === 'Donators' || r.name === 'Owner') && requestCount >= limit) return msg.channel.send('There are too many open requests right now. Wait until slots are opened.')
        let name = param.slice(1).join(' ')

        let filterUrls = param.filter(e => e.includes('vgmdb.net'))
        if (filterUrls.length > 1) return msg.channel.send('You can only specify one url per request.')

        if (filterUrls.length > 0) {
          let url = filterUrls[0]
          get(url.replace('vgmdb.net', 'vgmdb.info')).then(res => {
            let { data } = res
            submit(msg, db, `${data.name} (https://vgmdb.net/${data.link})`, { image: { url: data.picture_small } })
          }).catch(err => catchErr(msg, err))
        } else {
          submit(msg, db, name)
        }
      }
    },

    complete: {
      desc: 'Marks a request as completed',
      usage: '>complete [id] [link] [direct link]',
      async execute (client, msg, param, db) {
        if (!param[2]) return msg.channel.send('Incomplete command.')

        let req = db.prepare('SELECT request,msg,user FROM requests WHERE id=?').get(param[1])

        if (!req) return msg.channel.send(`Request not found.`)

        let link = param[2]

        db.prepare('INSERT INTO request_log (user,request,valid,reason,direct,timestamp) VALUES (?,?,\'YES\',?,?,datetime(\'now\'))').run(req.user, req.request, param[3] || 'NONE', link)
        db.prepare('DELETE FROM requests WHERE id=?').run(param[1])
        lock(msg, -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Completed by ${msg.author}\nLink: ${link}`)

          msg.guild.channels.find(c => c.name === 'last-added-soundtracks').send(`<@${req.user}> ${link}`)
          if (param[3]) msg.guild.channels.find(c => c.name === 'direct-links').send(`${req.request} ${param[3]}`)
        })
      }
    },

    reject: {
      desc: 'Marks a request as rejected',
      usage: '>reject [id] [reason]',
      async execute (client, msg, param, db) {
        if (!param[2]) return msg.channel.send('Incomplete command.')

        let req = db.prepare('SELECT request,msg,user FROM requests WHERE id=?').get(param[1])

        if (!req) return msg.channel.send(`Request not found.`)

        let reason = param.slice(2).join(' ')

        db.prepare('INSERT INTO request_log (user,request,valid,reason,direct,timestamp) VALUES (?,?,\'NO\',?,?,datetime(\'now\'))').run(req.user, req.request, reason, 'NONE')
        db.prepare('DELETE FROM requests WHERE user=?').run(req.user)
        lock(msg, -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: <@${req.user}>\nState: Rejected by ${msg.author}\nReason: ${reason}`)

          msg.guild.channels.find(c => c.name === 'requests-submission').send(`The request ${req.request} from <@${req.user}> has been rejected.\nReason: ${reason}`)
        })
      }
    }
  }
}

function submit (msg, db, name, embed = {}) {
  db.prepare('INSERT INTO requests (user,request,msg) VALUES (?,?,?)').run(msg.author.id, name, 'PENDING')
  let { id } = db.prepare('SELECT id FROM requests WHERE user=? AND request=? AND msg=?').get(msg.author.id, name, 'PENDING')

  embed.fields = [
    {
      'name': 'Request',
      'value': name
    },
    {
      'name': 'Requested by',
      'value': `${msg.author.tag} / ${msg.author.id}`,
      'inline': true
    },
    {
      'name': 'ID',
      'value': id,
      'inline': true
    }
  ]
  msg.guild.channels.find(c => c.name === 'open-requests').send({ embed: embed })
    .then(m => {
      db.prepare('UPDATE requests SET msg = ? WHERE id=?').run(m.id, id)
      msg.channel.send('Request submitted.')

      lock(msg, 1)
    })
    .catch(err => catchErr(msg, err))
}

function catchErr (msg, err) {
  console.log(err)
  msg.channel.send('Something went wrong.')
}

function lock (msg, ammount) {
  let channel = msg.guild.channels.find(c => c.name === 'requests-submission')
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
          id: msg.guild.roles.find(r => r.name === 'Moderators').id,
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
