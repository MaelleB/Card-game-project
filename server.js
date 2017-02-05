var players = [];
var nbOfPlayers = 0;
var cards = [{'num':0}, {'num':1}, {'num':2}, {'num':3}, {'num':4}, {'num':5},];
var currentPlayer = null, nPlayer = null;
var basicAttack = 5, basicDefense = 5;

var app = require('http').createServer(function(req, res){});
app.listen(8888);
var io = require("socket.io").listen(app);

function createPlayer(alias, att, def, s){
  this.aliasName = alias;
  this.attack = att;
  this.defense = def;
  this.status = s;
}

io.sockets.on('connection', function (socket) {
  socket.on('etat', function(message) {
    var etat = {"nbOfPlayers":nbOfPlayers, "players":players};
    io.emit('etat', etat);
  });

  socket.on('rejoindre',function(message) {
    console.log("coucou");
    playerName = message["playerName"];
    if(nbOfPlayers == 0){
      nPlayer = new createPlayer(playerName, basicAttack, basicDefense, 1);
      io.emit('status', {"playerStatus": nPlayer.status, "playerName": playerName});
    }
    else{
      nPlayer = new createPlayer(playerName, basicAttack, basicDefense, 0);
    }
    players.push(nPlayer);
    io.emit('newPlayer', {"playerNum":nbOfPlayers,
                          "playerName":playerName,
                          "playerAttack": nPlayer.attack,
                          "playerDefense": nPlayer.defense
                        });
    nbOfPlayers++;
  });

  socket.on('quitter',function(message) {
    numPlayer = message["numPlayer"];
    players.splice(numPlayer, 1);
    nbOfPlayers--;
    io.emit('offlinePlayer', message);
  });

});
