const channelID = '450103347526238209'
const msgID = '477561858987917342'

module.exports = {
  events: {
    async ready (client, db) {
      let msg = await client.channels.get(channelID).messages.fetch(msgID)
      await msg.reactions.forEach(r => r.users.fetch())

      console.log('Ready!')
    },

    async messageReactionAdd (client, db, reaction, user) {
      assign(reaction, user)
    },

    async messageReactionRemove (client, db, reaction, user) {
      assign(reaction, user)
    }
  }
}

async function assign (reaction, user) {
  if (user.bot) return
  if (reaction.message.id === msgID) {
    let reacts = reaction.message.reactions.filter(r => r.users.has(user.id))
    let platList = reacts.map(r => r.emoji.name)
    let platforms = `[${platList.join('/')}]`

    let member = reaction.message.guild.members.get(user.id)
    let name = member.nickname || user.username

    if (name.startsWith('[')) {
      name = name.split(' ').slice(1).join(' ')
    }

    member.setNickname(`${platforms} ${name}`)
    platList.forEach(name => {
      if (!member.roles.some(r => r.name === name)) member.roles.add(member.guild.roles.find(r => r.name === name))
    })
  }
}
