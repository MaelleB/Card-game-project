var socket,
  nbOfPlayers = 0, players = [],
  localPlayer = {"playerNum": -1},
  MAX_PLAYERS_NB = 5, MAX_EQUIPPED_CARDS = 4, MAX_HAND_CARDS = 6; //5 cards and th of equipped cards which can contain at most MAX_EQUIPPED_CARDS

//Client connects to the server and sends state data
socket = io("http://localhost:8888");
socket.emit("etat", {});

window.onload = function(){
  var svg = d3.select('#svgWin')
              .append('svg')
              .attr('width', 900)
              .attr('height', 650),

      drawn_card = svg.append('svg:image')
                .attr('id', 'drawnCard')
                .attr('x', 390)
                .attr('y', 170)
                .attr('width', '200')
                .attr('height', '310');

  svg.append('svg:image')
     .attr('id', 'cardsPile')
     .attr('x', 10)
     .attr('y', 300)
     .attr('width', 150)
     .attr('height', 232)
     .attr('xlink:href', 'images/cardback.png')
     .on('click', null);

}

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
  if (localPlayer.playerNum == -1) {
    var playerName = document.getElementsByName("player")[0].value;
    console.log("players: " + players);

    if (nbOfPlayers < MAX_PLAYERS_NB) {
      if (playerName != "" && !players.includes(playerName)) {
        console.log("Envoi de la connexion");
        localPlayer.playerNum = nbOfPlayers;

        $("button[id=join]").attr("disabled", "disabled");
        $("button[id=quit]").removeAttr("disabled");
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
  localPlayer.aliasName = player_data.playerName;
  localPlayer.attack = player_data.playerAttack;
  localPlayer.defense = player_data.playerDefense;
  document.getElementById("player"+nbOfPlayers).innerHTML = player_data.playerName;
  document.getElementById("attack"+nbOfPlayers).innerHTML = player_data.playerAttack;
  document.getElementById("defense"+nbOfPlayers).innerHTML = player_data.playerDefense;

  nbOfPlayers++;
});

/*
  Receiving the player's turn status:
  - If it's the local player's turn, enables the onClick event on the pile to
  draw a card
  - Else, disables it
*/
socket.on("status", function(status_data){
  console.log("En réception du statut de tour du joueur")
  localPlayer.status = status_data.playerStatus;

  if(status_data.playerStatus == 1){
    console.log("Tour du joueur " + status_data.playerName);

    if(status_data.playerNum == localPlayer.playerNum)
      d3.select('#cardsPile')
        .on('click', drawCard);
  }
  else{
    if(status_data.playerNum == localPlayer.playerNum)
      d3.select('#cardsPile')
        .on('click', null);
  }
});

//Quitting the game by clicking on a button
function quitterPartie() {
  console.log("Dans quitterPartie");

  if (localPlayer.playerNum > -1) {
    console.log("Suppression du joueur n." + localPlayer.playerNum);

    $("button[id=join]").removeAttr("disabled");
    $("input[name=player]").removeAttr("disabled");
    $("button[id=quit]").attr("disabled", "disabled");
    $("button[id=draw]").attr("disabled", "disabled");

    socket.emit("quitter", {"playerNum": localPlayer.playerNum});
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

  if (localPlayer.playerNum == playerNum)
    localPlayer = {"playerNum": -1};
  else if (localPlayer.playerNum > 0){
    let temp = localPlayer.playerNum;
    localPlayer = {"playerNum": temp-1};
  }

  players.splice(playerNum, 1);
  nbOfPlayers--;

  for (var i=playerNum; i <nbOfPlayers; i++){
    document.getElementById("player"+i).innerHTML = players[i];
    document.getElementById("attack"+i).innerHTML = offlinePlayer_data.players[i].attack;
    document.getElementById("defense"+i).innerHTML = offlinePlayer_data.players[i].defense;
  }
  document.getElementById("player"+i).innerHTML = "Joueur " + parseInt(nbOfPlayers + 1) + " : ";
  document.getElementById("attack"+i).innerHTML = "";
  document.getElementById("defense"+i).innerHTML = "";
});


//Activates the server-side card drawing phase
function drawCard(){
  socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

function modify(stat,value){
  console.log(localPlayer.playerNum);
  var target, newValue,lol;
  lol=(stat==0) ? 'defense'+localPlayer.playerNum :'attack'+localPlayer.playerNum;
  target= document.getElementById(lol);
  newValue=parseInt(target.innerHTML)+parseInt(value);
  // checking if it becomes negative
  if(newValue<0) newValue=0;
  target.innerHTML=newValue;
    socket.emit("modify",
    {"targetStat":stat, "newValue": newValue, "playerNum":localPlayer.playerNum}
  );
}
function modifyAll(stat,value){
  var  newValue,targetValue,newValues=[];
  targetValue= (stat==0) ? 'defense': 'attack';
  for (let i=0; i<players.length; i++){
    target = document.getElementById(targetValue+i);
    newValue=parseInt(target.innerHTML)+parseInt(value);
    if (newValue<0) newValue=0;
    target.innerHTML=newValue;
    newValues.push(newValue);
  }
  socket.emit("modifyAll", {"targetStat":stat, "new_Values": newValues});
}

//Function that executes a function whose name is passed as a string parameter
function executeStringFunction(func_string){
  var function_name = func_string.split("(")[0];
  var arguments_string = func_string.split("(")[1];
  var arguments_array = arguments_string.split(",");
  var last_element = arguments_array[arguments_array.length-1].split(")")[0];
  arguments_array.pop();
  arguments_array.push(last_element.trim());
  window[function_name].apply(this, arguments_array);
}

//Shows the active player's drawn card
socket.on("cardDrawn", function(card_data){
    d3.select("#drawnCard").attr('xlink:href', card_data.path );
    if (card_data.type == "event")
      executeStringFunction(card_data.action);
    else {
      var take_button = document.getElementById("take"),
        discard_button = document.getElementById("discard"),
        exchange_button = document.getElementById("exchange");
    }
});
