const path = require('path')
var speedTest = require(path.join(process.cwd(), 'node_modules', 'import-cwd'))('speedtest-net')
module.exports = {
  speedtest: {
    desc: 'Performs a speedtest.',
    usage: 'speedtest [server]',
    execute (client, msg, param, db) {
      const options = { log: false }
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
