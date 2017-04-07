var socket,
  nbOfPlayers = 0, players = [],
  localPlayer = {"playerNum": -1},
  map,
  MAX_PLAYERS_NB = 5, MAX_EQUIPPED_CARDS = 4, MAX_HAND_CARDS = 6; //5 cards and th of equipped cards which can contain at most MAX_EQUIPPED_CARDS

//Client connects to the server and sends state data
socket = io("http://localhost:8888");
socket.emit("etat", {});

window.onload = function(){
  socket.emit("loadMap");

  var svg = d3.select('#svgWin')
              .append('svg')
              .attr('width', 900)
              .attr('height', 650);

  createMapHexagons(20, 5, 6);

  var drawn_card = svg.append('svg:image')
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

  for(let i=1; i<=5; i++){
    svg.append('svg:image')
       .attr('id','hand'+i)
       .attr('height', 150)
       .attr('width', 100)
       .attr('x', 300)
       .attr('y', 490)
       .attr('xlink:href', '');
  }
}

//Client receives map data from server and stores it in the map variable
socket.on("mapLoaded", function(map_data){
  map = map_data;
});

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
  console.log("En réception du statut de tour du joueur");
  localPlayer.status = status_data.playerStatus;
  showHand();

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

//Shows the active player's hand
function showHand(){
  if(localPlayer.hand.length > 0){
    var currentCard;
    if(localPlayer.hand.length){
      for(let i=1; i<localPlayer.hand.length; i++){
        currentCard = localPlayer.hand[i];
        d3.select('#hand'+i)
          .attr('xlink:href', currentCard.path)
          .attr('x', i*100);
      }
    }
  }
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
socket.on("drawnCard", function(card){
    d3.select("#drawnCard").attr('xlink:href', card.path);

    //Disables card drawing on click on the pile
    d3.select('#cardsPile')
      .on('click', null);

    if (card.type == "event"){
      executeStringFunction(card.action); //we directly execute the action if the card is an event
      // TODO : pass turn to next player
      // Should add the "pass turn" button
      // socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
    }
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

// Creates a hexagon
function createHexagon(radius){
  var pts = new Array();
  var angle, x, y;
  for(let i=0; i<6; i++){
    angle = i*Math.PI/3;
    x = Math.sin(angle)*radius;
    y = -Math.cos(angle)*radius;
    pts.push([Math.round(x*100)/100, Math.round(y*100)/100]);
  }
  return pts;
}

// Creates the hexagons composing the map
function createMapHexagons(radius, lines, columns){
  dist = radius - (Math.sin(Math.PI/3)*radius);
  d3.select('svg').append('svg')
                      .attr('id', 'svgMap')
                      .attr('width', (columns+1)*2*radius)
                      .attr('height', lines*2*radius)
                      .attr('x', 10)
                      .attr('y', 10);
  var hexagon = createHexagon(radius), d, x, y;
  for(let l=0; l<lines; l++){
    for(let c=0; c<columns; c++){
      d = "";
      for(h in hexagon){
        if(l%2){
          x = hexagon[h][0]+(radius-dist)*(2+2*c);
        }
        else{
          x = hexagon[h][0]+(radius-dist)*(1+2*c);
        }
        y = dist*2+hexagon[h][1]+(radius-dist*2)*(1+2*l);
        if(h == 0){
          d += "M"+x+","+y+" L";
        }
        else{
          d += x+","+y+" ";
        }
      }
      d += "Z";
      d3.select('#svgMap').append('path')
                          .attr('d', d)
                          .attr('stroke', 'black')
                          .attr('fill', 'green')
                          .attr('id', l+':'+c);
    }
  }

}
