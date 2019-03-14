let requestCount = 0
let limit = 20
const { get } = require('axios')

module.exports = {
  async reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS requests (user TEXT, request TEXT, msg TEXT, PRIMARY KEY (user))').run()
    db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, reason TEXT, timestamp DATETIME)').run()
    requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get().count
  },
  commands: {
    request: {
      desc: 'Request a soundtrack',
      usage: '>request [url or name]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or name')

        let req = db.prepare('SELECT request FROM requests WHERE user=?').get(msg.author.id)
        if (!msg.member.roles.some(r => r.name === 'Donators') && req) return msg.channel.send(`The request '${req.request}' is still on place. Wait until its fulfilled or rejected.`)

        let name = param.slice(1).join(' ')

        let filterUrls = param.filter(e => e.includes('vgmdb.net'))
        if (filterUrls.length > 1) return msg.channel.send('You can only specify one url per request.')

        if (filterUrls.length > 0) {
          let url = filterUrls[0]
          get(url.replace('vgmdb.net', 'vgmdb.info')).then(res => {
            let { data } = res
            submit(msg, db, `${data.name} (https://vgmdb.net/${data.link})`, { files: [data.picture_small] })
          }).catch(err => catchErr(msg, err))
        } else {
          submit(msg, db, name)
        }
      }
    },

    complete: {
      desc: 'Marks a request as completed',
      usage: '>complete @user [link]',
      async execute (client, msg, param, db) {
        await msg.guild.members.fetch()

        let user
        if (!param[2]) return msg.channel.send('Incomplete command.')

        if (msg.mentions.users.size > 0) user = msg.mentions.users.first()
        else if (msg.guild.members.some(m => m.tag === param[1])) user = msg.guild.members.find(m => m.tag === param[1]).user
        else if (msg.guild.members.has(param[1])) user = msg.guild.members.get(param[1])
        else return msg.channel.send(`'${param[1]} is not a valid user.'`)

        let req = db.prepare('SELECT request,msg FROM requests WHERE user=?').get(user.id)

        if (!req) return msg.channel.send(`This user doesnt have a request.`)

        let link = param.slice(2).join(' ')

        db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'YES\',?,datetime(\'now\'))').run(user.id, req.request, link)
        db.prepare('DELETE FROM requests WHERE user=?').run(user.id)
        lock(msg, -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: ${user}\nState: Completed by ${msg.author}\nLink: ${link}`)

          msg.guild.channels.find(c => c.name === 'last-added-soundtracks').send(`${user} ${link}`)
        })
      }
    },
    reject: {
      desc: 'Marks a request as rejected',
      usage: '>reject @user [reason]',
      async execute (client, msg, param, db) {
        await msg.guild.members.fetch()

        let user
        if (!param[2]) return msg.channel.send('Incomplete command.')

        if (msg.mentions.users.size > 0) user = msg.mentions.users.first()
        else if (msg.guild.members.some(m => m.tag === param[1])) user = msg.guild.members.find(m => m.tag === param[1]).user
        else if (msg.guild.members.has(param[1])) user = msg.guild.members.get(param[1])
        else return msg.channel.send(`'${param[1]} is not a valid user.'`)

        let req = db.prepare('SELECT request,msg FROM requests WHERE user=?').get(user.id)

        if (!req) return msg.channel.send(`This user doesnt have a request.`)

        let reason = param.slice(2).join(' ')

        db.prepare('INSERT INTO request_log (user,request,valid,reason,timestamp) VALUES (?,?,\'NO\',?,datetime(\'now\'))').run(user.id, req.request, reason)
        db.prepare('DELETE FROM requests WHERE user=?').run(user.id)
        lock(msg, -1)

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: ${user}\nState: Rejected by ${msg.author}\nReason: ${reason}`)

          msg.guild.channels.find(c => c.name === 'requests-submission').send(`The request ${req.request} from ${user} has been rejected.\nReason: ${reason}`)
        })
      }
    }
  }
}

function submit (msg, db, name, options = {}) {
  msg.guild.channels.find(c => c.name === 'open-requests').send(`Request: ${name}\nBy: ${msg.author}`, options)
    .then(m => {
      db.prepare('INSERT INTO requests (user,request,msg) VALUES (?,?,?)').run(msg.author.id, name, m.id)
      lock(msg, 1)
      msg.channel.send('Request submitted.')
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
  let perms = []
  let change = true
  if (requestCount >= limit) {
    channel.send('No more requests allowed')
    perms = [
      {
        id: msg.guild.roles.find(r => r.name === 'BOTs').id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      },
      {
        id: msg.guild.id,
        deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      }
    ]
  } else if (requestCount === limit - 1 && ammount === -1) {
    channel.send('Requests open')
    perms = [
      {
        id: msg.guild.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
      }
    ]
  } else change = false
  if (change) {
    console.log(perms)
    channel.overwritePermissions({
      permissionOverwrites: perms,
      reason: 'Submission locking/enabling'
    })
  }
}
