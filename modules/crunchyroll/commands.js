const execa = require('execa')
module.exports.commands = {
  'cr-dl': {
    desc: 'Lists the most active users.',
    usage: 'topactivity [number]',
    execute (client, msg, param, db) {
      console.log('here')
      execa('npm install').stdout
        .on('message', (msg, handle) => {
          console.log(msg)
        }).on('end', () => {
          console.log('end')
        })
    }
  }
}
