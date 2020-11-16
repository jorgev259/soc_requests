const { DataTypes } = global.requireFn('sequelize')

module.exports = (client, sequelize) => {
  sequelize.define('request', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user: DataTypes.STRING,
    valid: DataTypes.BOOLEAN
  })

  sequelize.define('vgmdb', {
    url: {
      type: DataTypes.STRING,
      primaryKey: true
    }
  })
}
