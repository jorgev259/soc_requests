const Traceroute = require('nodejs-traceroute')
module.exports = {
  commands: {
    traceroute: {
      desc: 'Perform a traceroute',
      usage: '>trace [url or ip]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or ip')
        try {
          const tracer = new Traceroute()
          tracer
            .on('destination', (destination) => {
              msg.channel.send(`Destination: ${destination}`)
            })
            .on('hop', (hop) => {
              msg.channel.send(`IP: ${hop.ip} / TTL:${hop.rtt1}`)
            })
            .on('close', (code) => {
              msg.channel.send(`Close: code ${code}`)
            })

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
          msg.channel.send('Something went wrong')
        }
      }
    }
  }
}
