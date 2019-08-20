var express = require('express')
var app = express()

var http = require('http').createServer(app)

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.set('port', process.env.PORT || 3005)
app.post('/soc/post', (req, res) => {
  console.log(req.body)
  res.send({})
})
module.exports = () => {
  http.listen(app.get('port'), function () {
    console.log('Web server listening on port ' + app.get('port'))
  })
}
