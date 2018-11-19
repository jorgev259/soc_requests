let { twitter, stream } = require('./util.js')
const { log } = require('../../utilities.js')

module.exports = {
  commands: {
    'twitteradd': {
      desc: 'Adds a twitter account to a designated channel for automatic posting. Usage: >twitteradd [username] [channel]',
      async execute (client, msg, param, db) {
        if (!param[2]) return msg.channel.send('Usage: twitter add username channel')
        let username = param[1]
        let channel = param[2]

        if (msg.mentions.channels.size > 0) channel = msg.mentions.channels.first().name
        if (!msg.guild.channels.some(c => c.name === channel)) return msg.channel.send('Channel doesnt exist')

        twitter.get('users/show', { screen_name: username }).then(res => {
          stream(client, db, [res.data.id_str])
          db.prepare('INSERT INTO twitter (id,channel) VALUES (?,?)').run(res.data.id_str, channel)
          msg.channel.send('Account added!')
        }).catch(err => {
          console.log(err)
          if (err.code === 50) return msg.channel.send('User not found')
          log(client, err.message || err.stack)
          msg.channel.send('Something went wrong!')
        })
      }
    }
  }
}
