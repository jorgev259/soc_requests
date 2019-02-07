module.exports = {
  async reqs (client, db) {
    db.prepare('CREATE TABLE IF NOT EXISTS requests (user TEXT, request TEXT, msg TEXT, PRIMARY KEY (user))').run()
    db.prepare('CREATE TABLE IF NOT EXISTS request_log (user TEXT, request TEXT, valid TEXT, reason TEXT, timestamp DATETIME)').run()
  },
  commands: {
    request: {
      desc: 'Request a soundtrack',
      usage: '>request [url or name]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or name')

        let req = db.prepare('SELECT request FROM requests WHERE user=?').get(msg.author.id)
        if (req) return msg.channel.send(`The request '${req.request}' is still on place. Wait until its fulfilled or rejected.`)

        let name = param.slice(1).join(' ')

        msg.guild.channels.find(c => c.name === 'open-requests').send(`Request: ${name}\nBy: ${msg.author}`)
          .then(m => {
            db.prepare('INSERT INTO requests (user,request,msg) VALUES (?,?,?)').run(msg.author.id, name, m.id)
            msg.channel.send('Request submitted.')
          })
          .catch(err => {
            console.log(err)
            msg.channel.send('Something went wrong.')
          })
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

        msg.guild.channels.find(c => c.name === 'open-requests').messages.fetch(req.msg).then(async m => {
          await m.delete()
          msg.guild.channels.find(c => c.name === 'requests-log').send(`Request: ${req.request}\nBy: ${user}\nState: Rejected by ${msg.author}\nReason: ${reason}`)

          msg.guild.channels.find(c => c.name === 'requests-submission').send(`The request ${req.request} from ${user} has been rejected.\nReason: ${reason}`)
        })
      }
    }
  }
}
