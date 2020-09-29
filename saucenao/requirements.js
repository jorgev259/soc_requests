const { DataTypes } = global.requireFn('sequelize')
const { STRING } = DataTypes

module.exports = (client, sequelize) => {
  sequelize.define('saucenao', {
    guild: {
      type: STRING,
      primaryKey: true
    },
    channel: {
      type: STRING,
      primaryKey: true
    }
  })
}
