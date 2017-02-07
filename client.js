var socket;
var nbOfPlayers = 0;
var players = [];
var localPlayer = -1;      // indice dans playersNames
var nPlayer = null;

function rejoindrePartie() {
  if (localPlayer == -1) {
    playerName = document.getElementsByName('player')[0].value;
    if (nbOfPlayers < 4) {
      if (playerName != "") {
        console.log("Envoi de la connexion");
        socket.emit("rejoindre", { "playerName": playerName });
        localPlayer = nbOfPlayers;
      }
    }
    else {
      console.log("Vous ne pouvez pas pour l'instant rejoindre le groupe !");
    }
  }
}

function quitterPartie() {
  console.log("Dans quitterPartie");
  if (localPlayer > -1) {
    console.log("Suppression du joueur n."+localPlayer);
    socket.emit("quitter", { "playerNum": localPlayer} );
  }
}

function drawCard(){
  socket.emit('playerTurn', {"playerNum": localPlayer});
}

socket = io('http://localhost:8888');
socket.emit("etat",{});  // Pour que le serveur renvoie les noms des joueurs déjà connectés

socket.on("etat", function(data) {
  console.log("Dans la réception d'état");
  for (var m in data) {
    console.log(m+" : "+data[m]);
    window[m] = data[m];  // MAGIQUE
    for (var i=0; i < players.length; i++) {
      console.log("player ="+players[i].aliasName);
      document.getElementById("player"+i).innerHTML = players[i].aliasName;
      document.getElementById("attack"+i).innerHTML = players[i].attack;
      document.getElementById("defense"+i).innerHTML = players[i].defense;
    }
  }
});

socket.on("newPlayer", function(data) {
  console.log("Du serveur : nouveau joueur");
  players.push(data["playerName"]);
  document.getElementById("player"+nbOfPlayers).innerHTML = data["playerName"];
  document.getElementById("attack"+nbOfPlayers).innerHTML = data["playerAttack"];
  document.getElementById("defense"+nbOfPlayers).innerHTML = data["playerDefense"];
  nbOfPlayers++;
});

socket.on("offlinePlayer", function(data) {
  var playerNum = data['playerNum'];
  var offlinePlayer = players[playerNum];
  console.log("Du serveur offlinePlayer = "+offlinePlayer+" (joueur n."+playerNum+")");
  if (localPlayer == playerNum){
    localPlayer = -1;
  }
  else if (localPlayer > 0){
    localPlayer--;
  }
  console.log("localPlayer = "+localPlayer);
  players.splice(playerNum, 1);
  nbOfPlayers--;
  for (var i=playerNum; i < nbOfPlayers; i++){
    document.getElementById("player"+i).innerHTML = players[i].aliasName;
  }
  document.getElementById("player"+i).innerHTML = "";
});

socket.on('cardDrawn', function(data){
  document.getElementById("card_num").innerHTML = data["cardNum"];
});

socket.on('status', function(data){
  console.log("En réception du statut de tour du joueur")
  if(data["playerStatus"] == 1){
    console.log("Tour du joueur "+data["playerName"]);
    if(data["playerNum"] == localPlayer){
      $("button[id=draw]").removeAttr('disabled');
    }
  }
  else{
    if(data["playerNum"] == localPlayer){
      $("button[id=draw]").attr("disabled", "disabled");
    }
  }
});
