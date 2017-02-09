var players = [];
var nbOfPlayers = 0;
var cards = [{'num':0}, {'num':1}, {'num':2}, {'num':3}, {'num':4}, {'num':5}];
var currentPlayer = null, nPlayer = null;
var basicAttack = 5, basicDefense = 5;

var app = require('http').createServer(function(req, res){});
app.listen(8888);
var io = require("socket.io").listen(app);

// Player constructor
function createPlayer(alias, att, def, s){
  this.aliasName = alias;
  this.attack = att;
  this.defense = def;
  this.status = s;
}

// Draws a random cards and sends cards data to the client
function cardDraw(){
  var cardNum = Math.floor(Math.random() * 5);
  io.emit('cardDrawn', {"cardNum":cardNum});
}

// Sends data state to the client
io.sockets.on('connection', function (socket) {
  socket.on('etat', function(message) {
    var etat = {"nbOfPlayers":nbOfPlayers, "players":players};
    io.emit('etat', etat);
  });

  // Creates a player in the array and sends player's data to the client
  socket.on('rejoindre',function(message) {
    var turnStatus = 0;
    playerName = message["playerName"];
    // If first player, activates the player's turn
    if(nbOfPlayers == 0){
      turnStatus = 1;
    }
    nPlayer = new createPlayer(playerName, basicAttack, basicDefense, turnStatus);
    players.push(nPlayer);
    io.emit('newPlayer', {"playerNum":nbOfPlayers,
                          "playerName":playerName,
                          "playerAttack": nPlayer.attack,
                          "playerDefense": nPlayer.defense
                        });
    io.emit('status', {"playerStatus": turnStatus,
                       "playerName": playerName,
                       "playerNum": nbOfPlayers }
                      );
   nbOfPlayers++;
  });

  // Removes a player from the array
  socket.on('quitter',function(message) {
    playerNum = message["playerNum"];
    players.splice(playerNum, 1);
    nbOfPlayers--;
    io.emit('offlinePlayer', message);
  });

  // Calls function tp draw card, activates next player's turn
  socket.on('playerTurn', function(data){
    cardDraw();
    var num;
    if(data["playerNum"] == nbOfPlayers-1){
      num = 0;
    }
    else{
      num = data["playerNum"]+1;
    }
    players[data["playerNum"]].status = 0;
    players[num].status = 1;
    io.emit('status', {"playerStatus": 1,
                       "playerName": players[num].aliasName,
                       "playerNum": num }
                      );
    io.emit('status', {"playerStatus": players[data["playerNum"]].status,
                       "playerName": players[data["playerNum"]].aliasName,
                       "playerNum": data["playerNum"] }
                      );
  });

});
