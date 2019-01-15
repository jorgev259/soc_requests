const Twitter = require('twit')({
  consumer_key: 'dNRsXzACONSW07UdJQ7Pjdkc6',
  consumer_secret: 'KD0SDdbzb7OrYNCgjJfUWo66dpSgLd8WCrn4fffaPYwo0wig6d',
  access_token: '858864621893058560-KImtTaWcQDMPkhKE6diK6QUQJOIeCt9',
  access_token_secret: 'pBkS7T83E4924krvkigXcHvk2dvitbCq6f2l6BzyDCeOH'
})
const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
let streams = {}
const { log } = require('../../utilities.js')
const { MessageEmbed } = require('discord.js')
const { loadImage, createCanvas } = require('canvas')

module.exports = {
  streams: streams,
  twitter: Twitter,
  stream (client, db, ids) {
    if (Object.keys(streams).some(r => ids.includes(r))) return
    var stream = Twitter.stream('statuses/filter', { follow: ids })
    ids.forEach(id => { streams[id] = stream })

    stream.on('tweet', async function (tweet) {
      if (Object.keys(streams).includes(tweet.user.id_str) || tweet.retweeted) {
        let twit = tweet
        let out = {}
        // if (tweet.retweeted_status) twit = tweet.retweeted_status

        let embed = new MessageEmbed()
          .setAuthor(`${twit.user.name} | ${twit.user.screen_name}`, twit.user.profile_image_url)
          .setThumbnail()
          .setColor(twit.user.profile_background_color)
          .setTimestamp()

        // let textArray = twit.text.split(' ')
        let url = `https://twitter.com/${twit.user.screen_name}/status/${twit.id_str}/`

        /* let sendText = ''
        if (twit.quoted_status) sendText += twit.quoted_status_permalink.expanded */

        // embed.addField('Tweet', textArray.join(' '))
        embed.addField('URL', url)

        embed.addField('Channel', 'Test channel')
        embed.attachFiles([{ name: 'imageTweet.png', attachment: await screenshotTweet(twit.id_str) }])
          .setImage('attachment://imageTweet.png')
        // if (tweet.retweeted_status) embed.addField('Retweeted by', tweet.user.screen_name)

        if (twit.extended_entities && twit.extended_entities.media) {
          let media = twit.extended_entities.media.filter(e => e.type === 'photo').map(e => loadImage(e.media_url))
          if (media.length > 1) {
            let array = await Promise.all(media)

            let widthTotal = 0
            let x = 0

            array.sort((a, b) => {
              return a.height > b.height ? -1 : b.height > a.height ? 1 : 0
            })

            array.forEach(e => { widthTotal += e.width })
            if (array[0] !== undefined) {
              let canvas = createCanvas(widthTotal, array[0].height)
              let ctx = canvas.getContext('2d')

              array.forEach(e => {
                ctx.drawImage(e, x, 0)
                x += e.width
              })

              /* embed.attachFiles([{ name: 'images.png', attachment: canvas.toBuffer() }])
              .setImage('attachment://images.png') */
              let buf = canvas.toBuffer()
              fs.writeFileSync(`media_temp/${twit.id_str}.png`, buf)
              out.files = [{ attachment: buf, name: 'images.png' }]
            }
          }
        }

        let stmt = db.prepare('SELECT channel FROM twitter WHERE id=?')
        out.embed = embed

        for (const row of stmt.iterate(tweet.user.id_str)) {
          embed.fields[1].value = `#${row.channel}`

          client.channels.find(c => c.name === 'tweet-approval').send(out).then(m => {
            m.react('✅').then(() => {
              m.react('❎').then(() => {
                m.react('❓').then(() => {
                  db.prepare('INSERT INTO tweets (id,url,channel) VALUES (?,?,?)').run(m.id, url, row.channel)
                })
              })
            })
          })
        }
      }
    })
    stream.on('error', function (err) {
      log(client, err.message)
    })
  }
}

async function screenshotTweet (id) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 5 })

  await page.goto(path.join(__dirname, `index.html?id=${id}`), {
    waitUntil: 'networkidle0' // ensures images are loaded
  })

  const rect = await page.evaluate(() => {
    const element = document.querySelector('#container')
    const { x, y, width, height } = element.getBoundingClientRect()
    return { left: x, top: y, width, height, id: element.id }
  })

  let buffer = await page.screenshot({
    path: `temp/${id}.png`,
    clip: {
      x: rect.left,
      y: rect.top,
      width: 550,
      height: rect.height
    }
  })

  return buffer
}
