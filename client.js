var socket,
  nbOfPlayers = 0,
  players = [],
  localPlayer = -1,
  MAX_PLAYERS_NB = 5;

//Client connects to the server and sends state data
socket = io("http://localhost:8888");
socket.emit("etat", {});

//Client receives state data from server and updates client-side data
socket.on("etat", function(state_data) {
  console.log("Dans la réception d'état");

  for (let d in state_data) {
    console.log(d + " : " + state_data[d]);

    if (d == "players"){
      var pl = state_data[d];
      if (pl.length){
        for (let i=0; i<pl.length; i++){
          console.log("player = " + pl[i].aliasName);
          players.push(pl[i].aliasName);
          document.getElementById("player"+i).innerHTML = pl[i].aliasName;
          document.getElementById("attack"+i).innerHTML = pl[i].attack;
          document.getElementById("defense"+i).innerHTML = pl[i].defense;
        }
      }
    }
    else{
      window[d] = state_data[d];
    }
  }
});

//Joining the game by clicking on a button
function rejoindrePartie() {
  if (localPlayer == -1) {
    playerName = document.getElementsByName("player")[0].value;
    console.log("players: " + players);

    if (nbOfPlayers < MAX_PLAYERS_NB) {
      if (playerName != "" && !players.includes(playerName)) {
        console.log("Envoi de la connexion");
        localPlayer = nbOfPlayers;

        $("button[id=join]").attr("disabled", "disabled");
        $("input[name=player]").attr("disabled", "disabled");
        $("input[name=player]").val("");

        socket.emit("rejoindre", {"playerName": playerName});
      }
      else
        console.log("Vous n'avez fournis aucun pseudo ou votre pseudo est déjà pris par un autre joueur");
    }
    else
      console.log("Vous ne pouvez pas pour l'instant rejoindre le groupe !");
  }
}

/*
  Adding a player to the game:
  - Adds the player's name to the players array
  - Shows the player's name, attack and defense in the html page
*/
socket.on("newPlayer", function(player_data) {
  console.log("Du serveur : nouveau joueur");

  players.push(player_data.playerName);
  document.getElementById("player"+nbOfPlayers).innerHTML = player_data.playerName;
  document.getElementById("attack"+nbOfPlayers).innerHTML = player_data.playerAttack;
  document.getElementById("defense"+nbOfPlayers).innerHTML = player_data.playerDefense;

  nbOfPlayers++;
});

/*
  Receiving the player's turn status:
  - If it's the local player's turn, enables the button to draw a card
  - Else, disables it
*/
socket.on("status", function(status_data){
  console.log("En réception du statut de tour du joueur")

  if(status_data.playerStatus == 1){
    console.log("Tour du joueur " + status_data.playerName);

    if(status_data.playerNum == localPlayer)
      $("button[id=draw]").removeAttr("disabled");
  }
  else{
    if(status_data.playerNum == localPlayer)
      $("button[id=draw]").attr("disabled", "disabled");
  }
});

//Quitting the game by clicking on a button
function quitterPartie() {
  console.log("Dans quitterPartie");

  if (localPlayer > -1) {
    console.log("Suppression du joueur n." + localPlayer);

    $("button[id=join]").removeAttr("disabled");
    $("input[name=player]").removeAttr("disabled");

    socket.emit("quitter", {"playerNum": localPlayer});
  }
}

/*
Removing a player from the game:
  - Removes the name from the players array
  - Removing the name, attack and defense from the html page
*/
socket.on("offlinePlayer", function(offlinePlayer_data) {
  var playerNum = offlinePlayer_data.playerNum,
    offlinePlayer = players[playerNum];

  console.log("Du serveur offlinePlayer = " + offlinePlayer + " (joueur n." + playerNum + ")");

  if (localPlayer == playerNum)
    localPlayer = -1;
  else if (localPlayer > 0)
    localPlayer--;

  players.splice(playerNum, 1);
  nbOfPlayers--;

  for (var i=playerNum; i <nbOfPlayers; i++){
    document.getElementById("player"+i).innerHTML = players[i];
    document.getElementById("attack"+i).innerHTML = offlinePlayer_data.players[i].attack;
    document.getElementById("defense"+i).innerHTML = offlinePlayer_data.players[i].defense;
  }
  document.getElementById("player"+i).innerHTML = "";
  document.getElementById("attack"+i).innerHTML = "";
  document.getElementById("defense"+i).innerHTML = "";
});


//Activates the server-side card drawing phase
function drawCard(){
  socket.emit("playerTurn", {"playerNum": localPlayer});
}

//Shows the active player's drawn card
socket.on("cardDrawn", function(card_data){
  if (card_data.path);
    document.getElementById("card_num").innerHTML = '<img src="' + card_data.path + '" width="100" height="100" />';
});
