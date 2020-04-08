var speedTest = require('speedtest-net')
module.exports.commands = {
  'speedtest': {
    desc: 'Performs a speedtest.',
    usage: 'speedtest [server]',
    execute (client, msg, param, db) {
      let options = { log: false }
      if (param[1]) options.serverId = param[1]

      speedTest.visual(options, (err, data) => {
        if (err) {
          msg.channel.send('Something went wrong!')
          throw err
        }

        msg.channel.send(JSON.stringify(data, null, 4), { code: true })
      })
    }
  }
}
