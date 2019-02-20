const Traceroute = require('nodejs-traceroute')
let msgs = {}

module.exports = {
  commands: {
    trace: {
      desc: 'Perform a traceroute',
      usage: '>trace [url or ip]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or ip')

        try {
          const tracer = new Traceroute()
          let pid
          tracer
            .on('pid', async (pidIn) => {
              pid = pidIn
              msgs[pid] = {
                text: `pid: ${pid}`,
                msg: await msg.channel.send(msgs[pid].text, { code: true })
              }
            })
            .on('destination', (destination) => {
              msgs[pid].text += `\ndestination: ${destination}`
              msg.channel.edit(msgs[pid].text, { code: true })
            })
            .on('hop', (hop) => {
              msgs[pid].text += `\nhop: ${hop.hop}\n${hop.hostname ? `${hop.hostname} (${hop.ip})` : hop.ip}\n${hop.rtt1 ? hop.rtt1 : ''}`
              msg.channel.edit(msgs[pid].text, { code: true })
            })
            .on('close', (code) => {
              msgs[pid].text += `\nclose: code ${code}`
              msg.channel.edit(msgs[pid].text, { code: true })
            })

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
}
