var players = [], nbOfPlayers = 0,
  BASIC_ATTACK = 5, BASIC_DEFENSE = 5,
  mapAux, map;

//Setting the server and making it listen at port 8888
var app = require("http").createServer(function(req, res){});
app.listen(8888);

//Setting the socket between the client and the server
var io = require("socket.io").listen(app);

io.sockets.on("connection", function (socket) {

  //Loading the map from database
  socket.on("loadMap", function(){

    //setting Mongodb client, and url of the database to interact with
    var MongoClient = require("mongodb").MongoClient,
    assert = require("assert"),
    url = "mongodb://localhost:27017/CardGame";

    //connecting to the CardGame database
    MongoClient.connect(url, function(err, db){
      assert.equal(null, err);
      //getting the Map collection length
      db.collection("MapTiles").find({}).toArray(function(err, result){
        assert.equal(null, err);

        if (result.length){
          mapAux = result;
          map = new Array();
          var i, index = -1;
          for(i=0; i<mapAux.length; i++){
            if(mapAux[i].id.charAt(0) > index){
              map[(mapAux[i].id).charAt(0)] = new Array();
              index = mapAux[i].id.charAt(0);
            }
            map[(mapAux[i].id).charAt(0)][(mapAux[i].id).charAt(2)] = mapAux[i];
          }
          io.emit("mapLoaded", map);
        }
      });
    });
  });

  socket.on("drawMap", function(){
    io.emit("drawMap", 20, 5, 6);
  });

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

    var nPlayer = new Player(playerName, BASIC_ATTACK, BASIC_DEFENSE, turnStatus, [[]]);
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
          socket.emit("drawnCard", card);
          io.emit("showCard",card);
        }
      });
    });
  }

  //Calls function to draw card
  socket.on("drawCard", function(){
    drawCardServer();
  });

  socket.on("cardTaken", function(card_data){
   console.log("length of hand before: " + players[card_data.playerNum].hand.length);
   players[card_data.playerNum].hand.push(card_data.card);
   console.log("length of hand after: " + players[card_data.playerNum].hand.length);
   io.emit("discardCardAllClients", {});
  });

  socket.on("cardDiscarded",function(){
    io.emit("discardCardAllClients", {});
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

	//Callback function upon calling modifyCard
	socket.on("modifyCard", function(card_data){
		var indexPlayer = card_data.playerNum,
			indexCard = players[indexPlayer].hand.indexOf(card_data.card);
		players[indexPlayer].hand.splice(indexCard, 1);
	});

  //Callback function upon calling modifyAll
  socket.on("modifyAll", function(new_data){
    var target;
    target= new_data['targetStat'];
    if(target==0){
      for (var i=0; i<players.length; i++){
        players[i].defense  = new_data['new_Values'][i];
        console.log("player " + (i+1) +"defense"+ players[i].defense);
      }
    }
    else{
      for (var i=0; i<players.length; i++){
        players[i].attack = new_data["new_Values"][i];
        console.log("player " + (i+1) +"attack"+ players[i].attack);
      }
    }
  });
  //Callback function upon calling modify
  socket.on("modify", function(new_data){
      var target,num;
      target= new_data["targetStat"];
      num=parseInt(new_data.playerNum);
      if(target==0){
        players[num].defense=new_data["newValue"];
        console.log("player " + num + " defense: " + players[num].defense);

      }
      else {
        players[num].attack = new_data["newValue"];
        console.log("player " + num + " attack: " + players[num].attack);
      }
	  io.emit("etat", {"nbOfPlayers": nbOfPlayers, "players": players});
  });
});
