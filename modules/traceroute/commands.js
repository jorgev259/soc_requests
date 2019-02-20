const Traceroute = require('nodejs-traceroute')

module.exports = {
  commands: {
    trace: {
      desc: 'Perform a traceroute',
      usage: '>trace [url or ip]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or ip')

        try {
          const tracer = new Traceroute()
          tracer
            .on('pid', (pid) => {
              msg.channel.send(`pid: ${pid}`)
            })
            .on('destination', (destination) => {
              msg.channel.send(`destination: ${destination}`)
            })
            .on('hop', (hop) => {
              msg.channel.send(`hop: ${hop.hop}\n${hop.hostname ? `${hop.hostname} (${hop.ip})` : hop.ip}\n${hop.rtt1 ? hop.rtt1 : ''}`, { code: true })
            })
            .on('close', (code) => {
              msg.channel.send(`close: code ${code}`)
            })

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
}
