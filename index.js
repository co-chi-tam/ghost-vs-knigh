// HOST 
const HOST = process.env.HOST || 'localhost';
// PORT
const PORT = process.env.PORT || 3030;

var express = require('express');
var app = express();
var http = require('http').Server(app);
// GAME LOGIC XO
var GameXO = require('./src/gameManager')(http);

// app.use('/lib', express.static(__dirname + '/public'));

// SEND index.html page
app.get('/', function(req, res) {
   res.sendfile(__dirname + '/page/index.html');
});

// SERVER LISTEN WITH PORT
http.listen(PORT, function() {
   console.log('listening on ' + HOST + ':' + PORT);
}); 