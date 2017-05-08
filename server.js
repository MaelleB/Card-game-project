/*GLOBAL VARIABLES*/
var nbOfPlayers = 0, players = [],
  mapAux, map;

/*CONSTANTS*/
var BASIC_ATTACK = 5,
  BASIC_DEFENSE = 5;

//sets the server and makes it listen at port 8888
var app = require("http").createServer(function(req, res){});
app.listen(8888);

//sets the socket between the client and the server
var io = require("socket.io").listen(app);

io.sockets.on("connection", function (socket) {

  /*CONNECTION/JOINING/QUITTING/CHATTING FUNCTIONS
	===============================================*/
  //sends server-side state data to client upon connection
  socket.on("etat", function() {
    io.emit("etat",
    {
      "nbOfPlayers": nbOfPlayers,
      "players": players
    });
  });

  /*PLAYER CONSTRUCTOR*/
  function Player(alias, att, def, s, h, n){
    this.aliasName = alias;
    this.attack = att;
    this.defense = def;
    this.status = s;
    this.hand = h;
    this.nbEquippedCards = n;
  }

  /*
	creating a new player:
    - adds the player to the players array
    - sends the player's data and turnstatus_data to the client
	*/
  socket.on("rejoindre", function(player_data) {
    var turnStatus = 0,
      playerName = player_data.playerName;

    //if first player, activates the player's turn
    if(!nbOfPlayers)
      turnStatus = 1;

    var nPlayer = new Player(playerName, BASIC_ATTACK, BASIC_DEFENSE, turnStatus, [], 0);
    players.push(nPlayer);
    nbOfPlayers++;

    socket.emit("newPlayer",
    {
      "playerAttack": nPlayer.attack,
      "playerDefense": nPlayer.defense,
      "signalType": "socket"
    });

    socket.broadcast.emit("newPlayer",
    {
      "playerName": playerName,
      "signalType": "broadcast"
    });

    io.emit("etat",
    {
      "nbOfPlayers": nbOfPlayers,
      "players": players
    });

    io.emit("status",
    {
      "playerNum": player_data.playerNum,
      "playerName": playerName,
      "playerStatus": turnStatus
    });
  });

  socket.on("chatMessage", function(data){
    socket.broadcast.emit("chatMessage", data);
  });

  //removes the player from the players array
  socket.on("quitter", function(player_data) {
    var playerNum = player_data.playerNum;
    players.splice(playerNum, 1);
    nbOfPlayers--;

    io.emit("offlinePlayer",
    {
      "playerNum": playerNum,
      "players": players
    });
  });
  /*=====================================================================*/
	/*MAP FUNCTIONS
	===============*/
  //loads the map from database
  socket.on("loadMap", function(){
    //setting Mongodb client, and url of the database to interact with
    var MongoClient = require("mongodb").MongoClient,
      assert = require("assert"),
      url = "mongodb://localhost:27017/CardGame";

    //connects to the CardGame database
    MongoClient.connect(url, function(err, db){
      assert.equal(null, err);

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

          socket.emit("mapLoaded", map);
        }
      });
    });
  });

  //emits signal to draw map for client
  socket.on("drawMap", function(){
    socket.emit("drawMap", 20, 5, 6);
  });

  /*@Maëlle: Missing description*/
  socket.on("changeTile", function(direction){
    io.emit("changeMapTile", direction);
  });
  /*=====================================================================*/
	/*CARD FUNCTIONS
	================*/

  //draws a random card and sends its data to the client
  function drawCardServer(){
    //sets Mongodb client, and url of the database to interact with
    var MongoClient = require("mongodb").MongoClient,
      assert = require("assert"),
      url = "mongodb://localhost:27017/CardGame";

    //connects to the CardGame database
    MongoClient.connect(url, function(err, db){
      assert.equal(null, err);

      db.collection("Cards").find({}).toArray(function(err, result){
        assert.equal(null, err);

        if (result.length){
          var random_value = Math.floor(Math.random() * result.length),
            card = result[random_value];

          console.log("carte tirée: " + card.id);

          socket.emit("drawnCard", card);
          io.emit("showCard", card);
        }
      });
    });
  }

  //calls draw card function
  socket.on("drawCard", function(){
    drawCardServer();
  });

  /*
	- calls function to draw card
	- activates next player's turn
	*/
  socket.on("playerTurn", function(player_data){
    var num;

    if (player_data.playerNum == nbOfPlayers-1)
      num = 0;
    else
      num = player_data.playerNum + 1;

    players[player_data.playerNum].status = 0;
    players[num].status = 1;

    io.emit("status",
    {
      "playerStatus": 1,
      "playerName": players[num].aliasName,
      "playerNum": num
    });

    io.emit("status",
    {
      "playerStatus": players[player_data.playerNum].status,
      "playerName": players[player_data.playerNum].aliasName,
      "playerNum": player_data.playerNum
    });
  });

  /*
	- adds card to the corresponding player's hand in players
	- discards cards from all players' windows
	*/
  socket.on("cardTaken", function(card_data){
    players[card_data.playerNum].hand.push(card_data.card);
    io.emit("discardCardAllClients");
  });

  //discards card from all players' windows
  socket.on("cardDiscarded", function(){
    io.emit("discardCardAllClients");
  });


  //returns the index of a card in a hand
  function indexCard(hand, card){
    for (var i=0; i<hand.length; i++)
      if (JSON.stringify(hand[i]) == JSON.stringify(card))
        return i;
    return -1;
  }

  //modifies card upon use/toss functions (client-side) firing
	socket.on("modifyCard", function(card_data){
		var indexPlayer = card_data.playerNum,
      hand = players[indexPlayer].hand,
			indexC = card_data.indexC;

    if (card_data.functionName == "use" || card_data.functionName == "toss")
      hand.splice(indexC, 1);
    else if (card_data.functionName == "equip")
      hand[indexC].isEquipped = true;
    else {
      hand[card_data.indexEquC].isEquipped = false;
      hand[indexC].isEquipped = true;
    }
	});

  //modifies statistics of concerned player
  socket.on("modify", function(new_data){
    var target, num;
    target = new_data["targetStat"];
    num = parseInt(new_data.playerNum);

    if(target==0){
      players[num].defense = new_data["newValue"];
      console.log("player " + num + " defense: " + players[num].defense);
    }
    else {
      players[num].attack = new_data["newValue"];
      console.log("player " + num + " attack: " + players[num].attack);
    }

	  io.emit("etat",
    {
      "nbOfPlayers": nbOfPlayers,
      "players": players
    });
  });

  //modifies statistics of all players
  socket.on("modifyAll", function(new_data){
    var target;
    target = new_data['targetStat'];

    if(target==0){
      for (var i=0; i<players.length; i++){
        players[i].defense  = new_data["newValues"][i];
        console.log("player " + (i+1) + " defense " + players[i].defense);
      }
    }
    else{
      for (var i=0; i<players.length; i++){
        players[i].attack = new_data["newValues"][i];
        console.log("player " + (i+1) +"attack"+ players[i].attack);
      }
    }

    io.emit("modifyLocalStat", new_data);

    io.emit("etat",
    {
      "nbOfPlayers": nbOfPlayers,
      "players": players
    });
  });
});
