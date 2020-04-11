const images = ['tenor.gif', 'bonk.gif']
module.exports = {
  horny: {
    desc: 'Neutralizes a horny.',
    usage: 'horny [message ID]',
    async execute (client, msg, param, db) {
      if (!param[1]) return msg.channel.send('Specify the violating message. >horny [ID]')
      const viol = await msg.channel.messages.fetch(param[1])
      viol.member.roles.add('695486787099033620')
      msg.channel.send({
        files: [{
          attachment: images[Math.floor((Math.random() * images.length))],
          name: 'horny.gif'
        }]
      })
      viol.delete()
    }
  }
}
