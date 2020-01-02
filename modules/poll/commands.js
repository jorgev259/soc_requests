
const pollEmbed = require('discord.js-poll-embed')

// Call the pollEmbed method, first three arguments are required
// title is the poll title
// options is an array of strings, which contains the poll options
// timeout is the time in seconds for which users can vote for. 0 makes it infinite and default value is 30 seconds
// emojiList is the list of emojis used for voting. Defaults to 10 simple digit emojis. Which also limits the no of options you can give by default to 10. While using custom emojis be careful that discord doesnt support some emojis.
// forceEndPollEmoji is the emoji which can be voted by the poll author to force close voting. Default value is a green check box.

// There you go, now you have poll embeds
module.exports = {
  commands: {
    refresh: {
      desc: 'Reposts all open requests.',
      usage: 'poll [title]/[option1],[option2]',
      async execute (client, msg, param, db) {
        param.shift()
        const data = param.join(' ').split('/')
        const title = data[0]
        const options = data[1].split(',')
        pollEmbed(msg, title, options, 0)
      }
    }
  }
}
