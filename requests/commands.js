/* eslint-disable no-async-promise-executor  */
/* eslint-disable no-unsafe-finally */
const moment = global.requireFn('moment')
const { get } = global.requireFn('axios')
const getUrls = global.requireFn('get-urls')

const { GoogleSpreadsheet } = global.requireFn('google-spreadsheet')
const doc = new GoogleSpreadsheet('1D7X2YXffGGeLUKM9D_Q0lypuKisDuXsb3Yyj-cySiHQ')

async function getId (client, id, all = false) {
  doc.useServiceAccountAuth(client.config.requests.limit.google)
  await doc.loadInfo()

  const requests = doc.sheetsByIndex[0]
  let rows = await requests.getRows()
  if (all) {
    rows = [...rows, ...await doc.sheetsByIndex[1].getRows(), ...await doc.sheetsByIndex[2].getRows()]
  }

  return rows.filter(e => e.ID === id.toString())
}

module.exports = {
  refresh: {
    desc: 'Reposts all open requests.',
    usage: 'refresh',
    async execute (client, msg, param, sequelize) {
      doc.useServiceAccountAuth(client.config.requests.limit.google)
      await doc.loadInfo()

      const sheetRequests = doc.sheetsByIndex[0]
      const requestRows = await sheetRequests.getRows()
      const requestIds = requestRows.map(e => e.ID)

      const sheetDonator = doc.sheetsByIndex[1]
      const donatorRows = await sheetDonator.getRows()

      const rows = [...requestRows, ...donatorRows]
      runId(rows)

      function runId (ids) {
        if (!ids[0]) return
        const row = ids[0]

        const info = {
          request: row.Request,
          user: row['User ID'],
          id: row.ID,
          // hold: row.hold === 'YES',
          donator: !requestIds.includes(row.ID),
          oldMessage: row.Message
        }

        if (row.Link) {
          const filterUrls = row.Link.split(' ').filter(e => e.includes('vgmdb.net'))
          if (filterUrls.length > 0) info.vgmdb = filterUrls[0].replace('vgmdb.net', 'vgmdb.info').replace('(', '').replace(')', '')
        }

        sendEmbed(msg, sequelize, info, row)
          .then(() => {
            ids.shift()
            runId(ids)
          })
      }
    }
  },

  /* pending: {
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
  }, */

  hold: {
    desc: 'Marks a request as ON HOLD.',
    usage: 'hold [id] [reason]',
    async execute (client, msg, param, sequelize) {
      if (!param[2]) return msg.channel.send('Incomplete command.')

      const req = (await getId(client, param[1]))[0]
      if (!req) return msg.channel.send('Request not found.')

      const reason = param.slice(2).join(' ')

      const info = {
        request: req.Request,
        user: req['User ID'],
        hold: true,
        id: req.ID,
        msg: req.Message,
        url: req.Link
      }

      editEmbed(msg, sequelize, info)
        .then(async m => {
          const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
          msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${info.request}\nBy: <@${info.user}>\nState: ON HOLD by ${msg.author}\nReason: ${reason}`)

          talkChannel.send(`The request ${info.request}${info.url ? ` (${info.url})` : ''} from <@${info.user}> has put ON HOLD.\nReason: ${reason}`)

          lock(client, msg, -1)

          doc.useServiceAccountAuth(client.config.requests.limit.google)
          await doc.loadInfo()
          const sheetHold = doc.sheetsByIndex[2]
          const sheetRequests = doc.sheetsByIndex[0]
          sheetHold.addRow([info.id, info.request, (await msg.guild.members.fetch(info.user)).user.tag, info.user, req.Link, m.id])

          const rows = await sheetRequests.getRows()
          rows.find(e => e.ID === info.id.toString()).delete()
        })
        .catch(err => catchErr(msg, err))
    }
  },

  request: {
    desc: 'Request a soundtrack',
    usage: 'request [url or name]',
    async execute (client, msg, param, sequelize) {
      if (!param[1]) return msg.channel.send('Please provide a url or name')

      doc.useServiceAccountAuth(client.config.requests.limit.google)
      await doc.loadInfo()

      const requests = doc.sheetsByIndex[0]
      const requestCount = requests.rowCount - 1
      const limit = client.config.requests.limit.count

      const donator = msg.member.roles.cache.some(r => r.name === 'Donators')
      const owner = msg.member.roles.cache.some(r => r.name === 'Owner')

      const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
      if (!(donator || owner)) {
        const rows = await requests.getRows()
        const reqs = rows.filter(e => e['User ID'] === msg.author.id)

        if (reqs.length > 0) return talkChannel.send(`The request '${reqs[0].Request} ${reqs[0].Link ? `(${reqs[0].Link})` : ''}' is still on place. Wait until its fulfilled or rejected.`)
        if (requestCount >= limit) return msg.channel.send('There are too many open requests right now. Wait until slots are opened.')
      }
      let request = param.slice(1).join(' ')

      const urls = Array.from(getUrls(request, { normalizeProtocol: false, stripWWW: false, removeTrailingSlash: false, sortQueryParameters: false }))
      if (urls.length > 1) return msg.channel.send('You can only specify one url per request.')

      const url = urls[0]

      if (urls.length > 0) {
        const row = await sequelize.models.vgmdb.findByPk(url)
        if (row) return talkChannel.send(`This soundtrack has already been requested (${url})`)

        request = request.replace(url, '')
      }

      client.config.requests.currentID += 1

      const info = {
        id: client.config.requests.currentID,
        request: request,
        url: url,
        user: msg.author.id,
        donator: donator
      }

      if (url.includes('vgmdb.net')) info.vgmdb = url

      sendEmbed(msg, sequelize, info)
        .then(m => {
          msg.channel.send('Request submitted.')
          lock(client, msg, donator ? 0 : 1)

          const page = donator ? 1 : 0
          doc.sheetsByIndex[page].addRow([info.id, info.request, msg.author.tag, info.user, info.url, m.id])
        })
        .catch(err => catchErr(msg, err))
    }
  },

  complete: {
    desc: 'Marks a request as completed.',
    usage: 'complete [id]',
    async execute (client, msg, param, sequelize) {
      if (!param[1]) return msg.channel.send('Incomplete command.')

      const req = (await getId(client, param[1], true))[0]
      if (!req) return msg.channel.send('Request not found.')

      await sequelize.models.request.create({
        user: req['User ID'],
        request: `${req.Request}${req.Link ? ` (${req.Link})` : ''}`,
        valid: true
      })
      const sheetRequests = doc.sheetsByIndex[0]
      const rows = await sheetRequests.getRows()
      rows.find(e => e.ID === req.ID.toString()).delete()

      lock(client, msg, req.donator === 'YES' || req.hold === 'YES' ? 0 : -1)

      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(req.Message).then(async m => {
        await m.delete()
        msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${req.Request}\nBy: <@${req.User}>\nState: Completed by ${msg.author}`)
        msg.guild.channels.cache.find(c => c.name === 'last-added-soundtracks').send(`<@${req.User}`).then(m2 => m2.delete())
        const dm = await msg.guild.members.fetch(req.User)
        dm.send(`Your request '${req.Request}' has been uploaded!`).catch(e => {
          msg.guild.channels.cache.find(c => c.name === 'last-added-soundtracks').send(`<@${req.User}>`).then(m2 => m2.delete())
        })

        doc.useServiceAccountAuth(client.config.requests.limit.google)
        await doc.loadInfo()
        const sheetComplete = doc.sheetsByIndex[2]

        sheetComplete.addRow([param[1], req.name || req.Request, (await msg.guild.members.fetch(req.User)).user.tag, req.User, req.vgmdb || '', moment().format('D/M/YYYY')])

        if (req.donator === 'NO') {
          const sheetRequests = doc.sheetsByIndex[0]
          const rows = await sheetRequests.getRows()
          rows.find(e => e.ID === param[1].toString()).delete()
        }
      })
    }
  },

  reject: {
    desc: 'Marks a request as rejected',
    usage: 'reject [id] [reason]',
    async execute (client, msg, param, sequelize) {
      if (!param[2]) return msg.channel.send('Incomplete command.')

      const req = (await getId(client, param[1]))[0]
      if (!req) return msg.channel.send('Request not found.')

      const reason = param.slice(2).join(' ')

      sequelize.models.request.create({ user: req.User, request: req.Request, valid: false })
      if (req.Link && req.Link.includes('vgmdb.net')) {
        sequelize.models.vgmdb.destroy({ where: { url: req.Link } })
      }

      lock(client, msg, -1)

      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(req.Message).then(async m => {
        await m.delete()
        msg.guild.channels.cache.find(c => c.name === 'requests-log').send(`Request: ${req.Request}\nBy: <@${req.User}>\nState: Rejected by ${msg.author}\nReason: ${reason}`)
        const talkChannel = msg.guild.channels.cache.find(c => c.name === 'requests-talk')
        talkChannel.send(`The request ${req.Request} from <@${req.User}> has been rejected.\nReason: ${reason}`)

        doc.useServiceAccountAuth(client.config.requests.limit.google)
        await doc.loadInfo()

        const sheetRequests = doc.sheetsByIndex[0]

        const rows = await sheetRequests.getRows()
        rows.find(e => e.ID === param[1]).delete()
      })
    }
  }
}

async function sendEmbed (msg, sequelize, info, row) {
  if (info.oldMessage) {
    try {
      const oldMessage = await msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(info.oldMessage)
      oldMessage.delete()
    } catch (err) { }
  }

  try {
    if (info.vgmdb) {
      const { data } = await get(info.vgmdb.replace('vgmdb.net', 'vgmdb.info'))

      info.image = { url: data.picture_small }
      const vgmdbUrl = `https://vgmdb.net/${data.link}`
      info.request = data.name
      info.url = vgmdbUrl

      sequelize.models.vgmdb.findOrCreate({ where: { url: vgmdbUrl } })
    }
  } catch (err) {
    console.log(err)
  } finally {
    const embed = {
      fields: [
        {
          name: 'Request',
          value: `${info.request}${info.url ? ` (${info.url})` : ''}${info.hold ? ' **(ON HOLD)**' : ''}`
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
    if (info.image) embed.image = info.image

    const sent = await msg.guild.channels.cache.find(c => c.name === 'open-requests').send({ embed })
    if (row) {
      row.Message = sent.id
      await row.save()
    }

    return sent
  }
}

function editEmbed (msg, sequelize, info) {
  return new Promise(async (resolve, reject) => {
    const embed = {
      fields: [
        {
          name: 'Request',
          value: `${info.request}${info.url ? ` (${info.url})` : ''}${info.hold ? ' **(ON HOLD)**' : ''}`
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
      if (info.url && info.url.includes('vgmdb.net')) {
        const { data } = await get(info.url.replace('vgmdb.net', 'vgmdb.info'))
        embed.image = { url: data.picture_small }
      }
    } finally {
      msg.guild.channels.cache.find(c => c.name === 'open-requests').messages.fetch(info.msg).then(m => {
        m.edit({ embed })
          .then(resolve)
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
  const requests = doc.sheetsByIndex[0]

  const requestCount = requests.rowCount - 1 + ammount

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
  } else if (requestCount === limit - 1 && client.config.requests.locked) {
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
