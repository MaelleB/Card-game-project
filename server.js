var playersNames = [];
var nbOfPlayers = 0;

var app = require('http').createServer(function(req, res){});
app.listen(8888);
var io = require("socket.io").listen(app);
var cards = [{'num':0}, {'num':1}, {'num':2}, {'num':3}, {'num':4}, {'num':5},];
var currentPlayer = NULL;

io.sockets.on('connection', function (socket) {
  socket.on('etat', function(message) {
    var etat = {"nbOfPlayers":nbOfPlayers, "playersNames":playersNames};
    io.emit('etat', etat);
  });

  socket.on('rejoindre',function(message) {
    playerName = message["playerName"];
    playersNames.push(playerName);
    io.emit('newPlayer', {"playerNum":nbOfPlayers, "playerName":playerName });
    nbOfPlayers++;
  });

  socket.on('quitter',function(message) {
    numPlayer = message["numPlayer"];
    playersNames.splice(numPlayer, 1);
    nbOfPlayers--;
    io.emit('offlinePlayer', message);
  });

});
