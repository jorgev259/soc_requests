const { GoogleSpreadsheet } = global.requireFn('google-spreadsheet')
const doc = new GoogleSpreadsheet('1D7X2YXffGGeLUKM9D_Q0lypuKisDuXsb3Yyj-cySiHQ')

module.exports = {
  async ready (client) {
    doc.useServiceAccountAuth(client.config.requests.limit.google)
    await doc.loadInfo()

    const requests = doc.sheetsByIndex[0]
    const requestRows = (await requests.getRows()).map(e => e.ID)
    const donators = (await doc.sheetsByIndex[1].getRows()).map(e => e.ID)
    const hold = (await doc.sheetsByIndex[2].getRows()).map(e => e.ID)
    const complete = (await doc.sheetsByIndex[3].getRows()).map(e => e.ID)

    client.config.requests.currentID = Math.max(...[...requestRows, ...donators, ...hold, ...complete])
  }
}
