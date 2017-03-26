var players = [], nbOfPlayers = 0,
  BASIC_ATTACK = 5, BASIC_DEFENSE = 5;

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
  function Player(alias, att, def, s, h){
    this.aliasName = alias;
    this.attack = att;
    this.defense = def;
    this.status = s;
    this.hand = h;
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

    var nPlayer = new Player(playerName, BASIC_ATTACK, BASIC_DEFENSE, turnStatus, []);
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
  function drawCardServer(){
    //setting Mongodb client, and url of the database to interact with
    var MongoClient = require("mongodb").MongoClient,
    assert = require("assert"),
    url = "mongodb://localhost:27017/CardGame";

    /*
      connecting to the CardGame database
      getting the Cards collection length
    */
    MongoClient.connect(url, function(err, db){
      assert.equal(null, err);

      db.collection("Cards").find({}).toArray(function(err, result){
        assert.equal(null, err);

        if (result.length){
          var random_value = Math.floor(Math.random() * result.length),
            card = result[random_value];
          //var card = result[1];
          console.log("carte tirée: " + card.id);
          io.emit("drawnCard", card);
        }
      });
    });
  }

  //Calls function to draw card
  socket.on("drawCard", function(){
    drawCardServer();
  });

  //Calls function to draw card and activates next player's turn
  socket.on("playerTurn", function(player_data){
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

  //Callback function upon calling decreaseDefenseAll()/increaseDefenseAll() functions
  socket.on("modifyDefenseAll", function(defense_data){
    for (var i=0; i<players.length; i++){
      players[i].defense = defense_data["new_defense"][i];
      //console.log("player " + (i+1) + " defense: " + players[i].defense);
    }
  });

  //Callback function upon calling decreaseAttackAll()/increaseAttackAll() functions
  socket.on("modifyAttackAll", function(attack_data){
    for (var i=0; i<players.length; i++){
      players[i].attack = attack_data["new_attack"][i];
      console.log("player " + (i+1) + " attack: " + players[i].attack);
    }
  });

});
