var players = [],
  nbOfPlayers = 0,
  BASIC_ATTACK = 5,
  BASIC_DEFENSE = 5;
var cards = [{"num":0}, {"num":1}, {"num":2}, {"num":3}, {"num":4}, {"num":5}];

//Setting the server and making it listen at port 8888
var app = require("http").createServer(function(req, res){});
app.listen(8888);

//Setting the socket between the client and the server
var io = require("socket.io").listen(app);

io.sockets.on("connection", function (socket) {
  //Sending server-side state data to client upon connection
  socket.on("etat", function() {
    var state_data = {"nbOfPlayers": nbOfPlayers, "players": players};
    io.emit("etat", state_data);
  });

  //Player object constructor
  function Player(alias, att, def, s){
    this.aliasName = alias;
    this.attack = att;
    this.defense = def;
    this.status = s;
  }

  /*
  Creating a new player:
    - Adding the player to the players array
    - Sends the player's data and turnstatus_data to the client
  */
  socket.on("rejoindre", function(player_data) {
    var turnStatus = 0,
      playerName = player_data.playerName;

    //If first player, activates the player's turn
    if(!nbOfPlayers)
      turnStatus = 1;

    var nPlayer = new Player(playerName, BASIC_ATTACK, BASIC_DEFENSE, turnStatus);
    players.push(nPlayer);
    io.emit("newPlayer",
      {
        "playerNum": nbOfPlayers,
        "playerName": playerName,
        "playerAttack": nPlayer.attack,
        "playerDefense": nPlayer.defense
      });

    io.emit("status",
      {"playerStatus": turnStatus,
        "playerNum": nbOfPlayers,
       "playerName": playerName
      });

   nbOfPlayers++;
  });

  //Removing the player from the players array
  socket.on("quitter", function(player_data) {
    var playerNum = player_data.playerNum;
    players.splice(playerNum, 1);
    nbOfPlayers--;

    var offlinePlayer_data =
      {
        "playerNum": playerNum,
        "players": players
      };
    io.emit("offlinePlayer", offlinePlayer_data);
  });

  //Drawing a random card and sending its data to the client
  function cardDraw(){
    var cardNum = Math.floor(Math.random() * 5);
    io.emit("cardDrawn", {"cardNum":cardNum});
  }

  //Calls function to draw card and activates next player's turn
  socket.on("playerTurn", function(player_data){
    cardDraw();
    var num;

    if (player_data.playerNum == nbOfPlayers-1)
      num = 0;
    else
      num = player_data.playerNum + 1;

    players[player_data.playerNum].status = 0;
    players[num].status = 1;

    io.emit("status",
      {"playerStatus": 1,
       "playerName": players[num].aliasName,
       "playerNum": num
     });

    io.emit("status",
      {"playerStatus": players[player_data.playerNum].status,
       "playerName": players[player_data.playerNum].aliasName,
       "playerNum": player_data.playerNum
      });
  });

});
