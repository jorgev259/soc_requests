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
                msg: await msg.channel.send(`pid: ${pid}`, { code: true })
              }

              tracer
                .on('destination', destination => handleDestination(pid, destination))
                .on('hop', hop => handlehop(pid, hop))
                .on('close', code => handleClose(pid, code))
            })

          tracer.trace(param[1])
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
}

function handleDestination (pid, destination) {
  msgs[pid].text += `\ndestination: ${destination}`
  msgs[pid].msg.edit(msgs[pid].text, { code: true })
}

function handlehop (pid, hop) {
  msgs[pid].text += `\nhop: ${hop.hop}\n${hop.hostname ? `${hop.hostname} (${hop.ip})` : hop.ip}\n${hop.rtt1 ? hop.rtt1 : ''}`
  msgs[pid].msg.edit(msgs[pid].text, { code: true })
}

function handleClose (pid, code) {
  msgs[pid].text += `\nclose: code ${code}`
  msgs[pid].msg.edit(msgs[pid].text, { code: true })
  delete msgs[pid]
}
