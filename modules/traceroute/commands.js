const Traceroute = require('nodejs-traceroute')

module.exports = {
  commands: {
    trace: {
      desc: 'Perform a traceroute',
      usage: '>trace [url or ip]',
      async execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or ip')

        try {
          const tracer = new Traceroute()
          let sent = await msg.channel.send('Starting', { code: true })
          tracer
            .on('pid', pid => sent.edit(`${sent.content}\npid: ${pid}`, { code: true }))
            .on('destination', destination => sent.edit(`${sent.content}\ndestination: ${destination}`, { code: true }))
            .on('hop', hop => sent.edit(`${sent.content}\n${hop.hop}) ${hop.hostname ? `${hop.hostname} (${hop.ip})` : hop.ip} ${hop.rtt1 ? hop.rtt1 : ''}`, { code: true }))
            .on('close', code => sent.edit(`${sent.content}\nclose: code ${code}`, { code: true }))

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
}
