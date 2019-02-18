var TraceRoute = require('http-traceroute')
const Traceroute = require('nodejs-traceroute')

module.exports = {
  commands: {
    trace: {
      desc: 'Perform a traceroute',
      usage: '>trace [url or ip]',
      execute (client, msg, param, db) {
        if (!param[1]) return msg.channel.send('Please provide a url or ip')
        /* var trace = new TraceRoute(param[1])

        trace.on('readable', function () {
          var hop = null
          while (hop = this.read()) {
            console.log(hop)
            if(hop) msg.channel.send(hop)
          }
        })

        trace.once('error', function () { msg.channel.send('Something went wrong') })
        trace.once('end', function () { msg.channel.send('Finished') }) */
        
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
              msg.channel.send(`hop: ${JSON.stringify(hop)}`)
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
