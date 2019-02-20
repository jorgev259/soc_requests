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
          let content = 'Starting'
          let sent = await msg.channel.send(content, { code: true })

          tracer
            .on('pid', pid => info(sent, content, `pid: ${pid}`))
            .on('destination', destination => info(sent, content, `destination: ${destination}`))
            .on('hop', hop => info(sent, content, `${hop.hop}) ${hop.hostname ? `${hop.hostname} (${hop.ip})` : hop.ip} ${hop.rtt1 ? hop.rtt1 : ''}`))
            .on('close', code => info(sent, content, `close: code ${code}`))

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
}

function info (sent, content, info) {
  content += `\n${info}`
  sent.edit(content, { code: true })
}
