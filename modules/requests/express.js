var express = require('express')
var app = express()
const telegram = require('./telegram.js')

var http = require('http').createServer(app)

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.set('port', process.env.PORT || 3005)

var BitlyAPI = require('node-bitlyapi')
var Bitly = new BitlyAPI({})

module.exports = (client, db) => {
  Bitly.setAccessToken(client.data.tokens.bitly)
  app.post('/soc/post', async (req, res) => {
    res.send({})
    Bitly.shorten({ longUrl: req.body.post.guid }, function (err, results) {
      if (err) throw new Error(err)
      console.log(results)
      console.log(results['data'])
      console.log(results.data)
      const url = results.data.url
      client.guilds.first().channels.find(c => c.name === 'last-added-soundtracks').send(url)
      telegram.sendUpdate(url, db)
    })
  })
  http.listen(app.get('port'), function () {
    console.log('Web server listening on port ' + app.get('port'))
  })
}

/*
    { post_id: 37194,
  post:
   { ID: 37194,
     post_author: '1',
     post_date: '2019-08-20 06:03:03',
     post_date_gmt: '2019-08-20 04:03:03',
     post_content: '',
     post_title: 'testssssss',
     post_excerpt: '',
     post_status: 'publish',
     comment_status: 'closed',
     ping_status: 'closed',
     post_password: '',
     post_name: 'testssssss',
     to_ping: '',
     pinged: '',
     post_modified: '2019-08-20 06:03:03',
     post_modified_gmt: '2019-08-20 04:03:03',
     post_content_filtered: '',
     post_parent: 0,
     guid: 'https://www.sittingonclouds.net/?page_id=37194',
     menu_order: 0,
     post_type: 'page',
     post_mime_type: '',
     comment_count: '0',
     filter: 'raw',
     page_template: 'default' },
  post_meta:
   { wpwhpro_create_post_temp_status: [ 'inherit' ],
     _edit_lock: [ '1566273776:1' ],
     _edit_last: [ '1' ],
     _wp_page_template: [ 'default' ],
     _b2s_post_meta:
      [ 'a:6:{s:8:"og_title";s:10:"testssssss";s:7:"og_desc";s:0:"";s:8:"og_image";s:0:"";s:10:"card_title";s:10:"testssssss";s:9:"card_desc";s:0:"";s:10:"card_image";s:0:"";}' ] } }
*/
