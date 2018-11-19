
const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')
const drawMultilineText = require('canvas-multiline-text')

module.exports.commands = {
  changemymind: {
    async execute (client, msg, param, db) {
      if (!param[1]) return msg.channel.send('You need to specify a message')
      param.splice(0, 1)

      let text = param.join(' ')
      loadImage('resources/jokerclean.jpg').then((image) => {
        const canvas = createCanvas(image.width, image.height)
        let canvas2 = createCanvas(420, 210)
        const ctx = canvas.getContext('2d')
        const ctx2 = canvas2.getContext('2d')

        ctx.drawImage(image, 0, 0)
        ctx.translate(485, 360)
        ctx.rotate(-25 * (Math.PI / 180))

        ctx.fillStyle = '#ff0000'

        drawMultilineText(
          ctx2,
          text,
          {
            font: 'Courier',
            minFontSize: 1,
            verbose: false,
            lineHeight: 0
          }
        )

        ctx.drawImage(canvas2, 0, 20)

        fs.writeFileSync('test.png', canvas.toBuffer())
      })
    }
  }
}
