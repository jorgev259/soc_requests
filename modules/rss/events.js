var AsyncPolling = require('async-polling')
let Parser = require('rss-parser');
let parser = new Parser();
var rss = {}
module.exports.events = {
    async ready(client,db){
        client.data.rss.forEach(url){
            console.log(url)
        }
    }
}