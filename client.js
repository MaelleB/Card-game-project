var socket,
  nbOfPlayers = 0, players = [],
  localPlayer = {"playerNum": -1},
  MAX_PLAYERS_NB = 5, MAX_EQUIPPED_CARDS = 4, MAX_HAND_CARDS = 6; //5 cards and the array of equipped cards which can contain at most MAX_EQUIPPED_CARDS

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
        $("button[id=hand]").removeAttr("disabled");

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

  /*
    the first element in the hand array is the array of equippable Cards which is initially empty
    the hand array is never empty, it is initialised with an empty array of equippable cards and hence has an initial
    length of 1
  */
  localPlayer.hand = [[]];
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
        .on('click', drawCardClient);
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

//Activates the server-side card drawing phase when the card stack is clicked
function drawCardClient(){
  socket.emit("drawCard");
}

/*
- Adds the card to the hand when the take button is clicked
- Discards the card from the game board
- Activates the next player's turn
*/
function takeCard(card){
    localPlayer.hand.push(card);
    console.log("the local player's hand has " + parseInt(localPlayer.hand.length-1) + " cards, which are:\n");
    for (let i=1; i<localPlayer.hand.length; i++)
      console.log("card " + i + ": " + localPlayer.hand[i].id + "\n");
    d3.select("#drawnCard").attr('xlink:href', ""); //discarding the card from the game board once it is taken
    /*
      ToDo:
      adding the card to the hand of the corresponding player on the server-side
    */
    document.getElementById("take").style.visibility = "hidden";
    $("button[id=take]").attr("disabled", "disabled");

    document.getElementById("discard").style.visibility = "hidden";
    $("button[id=discard]").attr("disabled", "disabled");
    //Emits the signal to activate the next player's turn
    socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

//Discards the card from the board when the discard button is clicked and activates the next player's turn
function discardCard(card){
  d3.select("#drawnCard").attr('xlink:href', "");

  document.getElementById("take").style.visibility = "hidden";
  $("button[id=take]").attr("disabled", "disabled");

  document.getElementById("discard").style.visibility = "hidden";
  $("button[id=discard]").attr("disabled", "disabled");
  //Emits the signal to activate the next player's turn
  socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

/*
  - Increases attack of all players (client-side)
  - Displays the changes in the html page
  - Emits the changes to the server to update them on the server-side
*/
function increaseAttackAll(value){
  var player, initialAttackValue, newAttackValue, newAttackValues = [];

  for (let i=0; i<players.length; i++){
    player = document.getElementById("attack"+i);
    newAttackValue = initialAttackValue = parseInt(player.innerHTML);

    if (!(isNaN(initialAttackValue)))
      player.innerHTML = newAttackValue = initialAttackValue + parseInt(value);

    newAttackValues.push(newAttackValue);
  }
  socket.emit("modifyAttackAll", {"new_attack": newAttackValues});
}

/*
  - Decreases attack of all players (client-side)
  - Displays the changes in the html page
  - Emits the changes to the server to update them on the server-side
*/
function decreaseAttackAll(value){
  var player, initialAttackValue, newAttackValue, newAttackValues = [];

  for (let i=0; i<players.length; i++){
    player = document.getElementById("attack"+i);
    newAttackValue = initialAttackValue = parseInt(player.innerHTML);

    if (!isNaN(initialAttackValue) && initialAttackValue>0)
      player.innerHTML = newAttackValue = initialAttackValue - parseInt(value);

    newAttackValues.push(newAttackValue);
  }
  socket.emit("modifyAttackAll", {"new_attack": newAttackValues});
}

/*
  - Increases defense of all players (client-side)
  - Displays the changes in the html page
  - Emits the changes to the server to update them on the server-side
*/
function increaseDefenseAll(value){
  var player, initialDefenseValue, newDefenseValue, newDefenseValues = [];

  for (let i=0; i<players.length; i++){
    player = document.getElementById("defense"+i);
    newDefenseValue = initialDefenseValue = parseInt(player.innerHTML);

    if (!(isNaN(initialDefenseValue)))
      player.innerHTML = newDefenseValue = initialDefenseValue + parseInt(value);

    newDefenseValues.push(newDefenseValue);
  }
  socket.emit("modifyDefenseAll", {"new_defense": newDefenseValues});
}

/*
  - Decreases defense of all players (client-side)
  - Displays the changes in the html page
  - Emits the changes to the server to update them on the server-side
*/
function decreaseDefenseAll(value){
  var player, initialDefenseValue, newDefenseValue, newDefenseValues = [];

  for (let i=0; i<players.length; i++){
    player = document.getElementById("defense"+i);
    newDefenseValue = initialDefenseValue = parseInt(player.innerHTML);

    //console.log("decreaseDefenseAll/condition: " + !isNaN(initialDefenseValue));

    if (!isNaN(initialDefenseValue) && initialDefenseValue>0)
      player.innerHTML = newDefenseValue = initialDefenseValue - parseInt(value);

    newDefenseValues.push(newDefenseValue);
  }
  socket.emit("modifyDefenseAll", {"new_defense": newDefenseValues});
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
socket.on("drawnCard", function(card){
    d3.select("#drawnCard").attr('xlink:href', card.path);

    if (card.type == "event")
      executeStringFunction(card.action); //we directly execute the action if the card is an event
    else {
        var discard_button = document.getElementById("discard");
        discard_button.style.visibility = "visible";
        $(discard_button).removeAttr("disabled");

        discard_button.addEventListener("click", function(){
          discardCard(card);
        });

      if (localPlayer.hand.length<MAX_HAND_CARDS){
        var take_button = document.getElementById("take");

        take_button.addEventListener("click", function(){
          takeCard(card);
        });

        take_button.style.visibility = "visible";
        $(take_button).removeAttr("disabled");
      }
    }
});
