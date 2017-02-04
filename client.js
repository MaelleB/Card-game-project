var socket;
var nbOfPlayers = 0;
var playersNames = [];
var localPlayer = -1;      // indice dans playersNames

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
    socket.emit("quitter", { "numPlayer": localPlayer} );
  }
}

socket = io('http://localhost:8888');
socket.emit("etat",{});  // Pour que le serveur renvoie les noms des joueurs déjà connectés

socket.on("etat", function(data) {
  console.log("Dans la réception d'état");
  for (var m in data) {
    console.log(m+" : "+data[m]);
    window[m] = data[m];  // MAGIQUE
    for (var i=0; i < playersNames.length; i++) {
      console.log("player ="+playersNames[i]);
      document.getElementById("player"+i).innerHTML = playersNames[i];
    }
  }
});

socket.on("newPlayer", function(data) {
  console.log("Du serveur : nouveau joueur");
  playersNames.push(data["playerName"]);
  document.getElementById("player"+nbOfPlayers).innerHTML = data["playerName"];
  nbOfPlayers++;
});

socket.on("offlinePlayer", function(data) {
  var numPlayer = data['numPlayer'];
  var offlinePlayer = playersNames[numPlayer];
  console.log("Du serveur offlinePlayer = "+offlinePlayer+" (joueur n."+numPlayer+")");
  if (localPlayer == numPlayer){
    localPlayer = -1;
  }
  else if (localPlayer > 0){
    localPlayer--;
  }
  console.log("localPlayer = "+localPlayer);
  playersNames.splice(numPlayer, 1);
  nbOfPlayers--;
  for (var i=numPlayer; i < nbOfPlayers; i++){
    document.getElementById("player"+i).innerHTML = playersNames[i];
  }
  document.getElementById("player"+i).innerHTML = "";
});
