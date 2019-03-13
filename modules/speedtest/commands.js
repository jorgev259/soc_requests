var speedTest = require('speedtest-net')
module.exports.commands = {
  'speedtest': {
    desc: 'Performs a speedtest.',
    usage: '>speedtest',
    execute (client, msg, param, db) {
      speedTest.visual({ log: false }, (err, data) => {
        if (err) {
          msg.channel.send('Something went wrong!')
          throw err
        }

        msg.channel.send(JSON.stringify(data, null, 4), { code: true })
      })
    }
  }
}
