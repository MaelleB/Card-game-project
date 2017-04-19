var socket,
  nbOfPlayers = 0, players = [],
  localPlayer = {"playerNum": -1},
  map,
  MAX_PLAYERS_NB = 5, MAX_EQUIPPED_CARDS = 4, MAX_HAND_CARDS = 6; //5 cards and the array of equipped cards which can contain at most MAX_EQUIPPED_CARDS

//Client connects to the server and sends state data
socket = io("http://localhost:8888");
socket.emit("etat");

window.onload = function(){
  socket.emit("loadMap");

  var svg = d3.select('#svgWin')
              .append('svg')
              .attr('width', 900)
              .attr('height', 650);

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

  for(let i=1; i<=MAX_HAND_CARDS-1; i++){
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
  console.log("Map loaded");
  map = map_data;
  console.log(map);
  socket.emit("drawMap");
});

//Creates a hexagon
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
//function createMapHexagons(radius, lines, columns){
socket.on("drawMap", function(radius, lines, columns){
  var dist = radius - (Math.sin(Math.PI/3)*radius),
      positionX = 17, positionY = 20;
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

      if(map[l][c].environment == "river"){
        d3.select('#svgMap').append('path')
                            .attr('d', d)
                            .attr('stroke', 'black')
                            .attr('fill', 'rgba(50, 188, 203, 0.5)')
                            .attr('id', l+':'+c);
      }
      if(map[l][c].environment == "plain"){
        d3.select('#svgMap').append('path')
                            .attr('d', d)
                            .attr('stroke', 'black')
                            .attr('fill', 'rgba(6, 169, 11, 0.5)')
                            .attr('id', l+':'+c);
     }
     if(map[l][c].environment == "forest"){
       d3.select('#svgMap').append('path')
                           .attr('d', d)
                           .attr('stroke', 'black')
                           .attr('fill', 'rgba(77, 209, 63, 0.5)')
                           .attr('id', l+':'+c);
     }
     if(map[l][c].environment == "encounter"){
       d3.select('#svgMap').append('path')
                           .attr('d', d)
                           .attr('stroke', 'black')
                           .attr('fill', 'rgba(181, 3, 3, 0.5)')
                           .attr('id', l+':'+c);
    }
    d3.select('#svgMap').append('circle')
                        .attr('cx', positionX)
                        .attr('cy', positionY)
                        .attr('r', 7)
                        .attr('fill', 'rgb(53, 0, 0)');
   }
  }
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

function checkPseudo(name, array){
	var regex = new RegExp(name, "i"),
		length = array.length,
		i = 0;
	while (i < length){
		if (regex.test(array[i])) return true;
		i++;
	}
	
	return false;
}

//Joining the game by clicking on a button
function rejoindrePartie() {
  if (localPlayer.playerNum == -1) {
    var playerName = document.getElementsByName("player")[0].value;
    console.log("players: " + players);

    if (nbOfPlayers < MAX_PLAYERS_NB) {
      if (playerName != "" && !checkPseudo(playerName, players)) {
        console.log("Envoi de la connexion");
        localPlayer.playerNum = nbOfPlayers;

        $("#join").attr("disabled", "disabled");
        $("#quit").removeAttr("disabled");
        $("input[name=player]").attr("disabled", "disabled");
        $("input[name=player]").val("");
        $("#hand").removeAttr("disabled");
		
		document.title = playerName + " - " + document.title;

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
    if(status_data.playerNum == localPlayer.playerNum) {
      document.getElementById("take").style.visibility = "hidden";
      $("#take").attr("disabled", "disabled");

      document.getElementById("discard").style.visibility = "hidden";
      $("#discard").attr("disabled", "disabled");

      d3.select('#cardsPile')
        .on('click', null);
    }

  }
});

//Quitting the game by clicking on a button
function quitterPartie() {
  console.log("Dans quitterPartie");

  if (localPlayer.playerNum > -1) {
    console.log("Suppression du joueur n." + localPlayer.playerNum);

    $("#join").removeAttr("disabled");
    $("input[name=player]").removeAttr("disabled");
    $("#quit").attr("disabled", "disabled");
    $("#draw").attr("disabled", "disabled");

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

function useCard(){
	executeStringFunction(this.action);
	console.log("playerNum : " + localPlayer.playerNum);
	socket.emit("modifyCard", {playerNum: localPlayer.playerNum, card: this});
	var indexCard = localPlayer.hand.indexOf(this);
	localPlayer.hand.splice(indexCard, 1);
	showHand();
}

function initCardActions(card, index){
	var use_button = document.getElementById("use");
	if (card.type == "usable"){
		card.use = useCard;
		$("#hand"+index).on("focus", function(){
			use_button.style.visibility = "visible";
			$("#use").removeAttr("disabled");
			$("#use").off("click").on("click", function(){
				card.use();
			});
		});
	}
}

//Shows the active player's hand
function showHand(){
	for(let i=1; i<=MAX_HAND_CARDS-1; i++)
		d3.select('#hand'+i).attr('xlink:href', '');
	
	if(localPlayer.hand.length){
		var currentCard;
		for(let i=1; i<localPlayer.hand.length; i++){
			currentCard = localPlayer.hand[i];
			d3.select('#hand'+i)
			.attr('xlink:href', currentCard.path)
			.attr('x', i*100);
			initCardActions(currentCard, i);
			//handling focus event of current card
			/*$("#hand"+i).off("blur").on("blur", function(){
				use_button.style.visibility = "hidden";
				$("#use").attr("disabled", "disabled");
			});*/
		}
	}
}

/*
- Adds the card to the hand when the take button is clicked
- Discards the card from the game board
- Activates the next player's turn
*/
function takeCard(card){
  console.log(localPlayer.hand)
    localPlayer.hand.push(card);
    console.log("the local player's hand has " + parseInt(localPlayer.hand.length-1) + " cards, which are:\n");
    for (let i=1; i<localPlayer.hand.length; i++)
      console.log("card " + i + ": " + localPlayer.hand[i].id + "\n");

    socket.emit("cardTaken", { card: card,
      playerNum: localPlayer.playerNum
    }
  );

    //Emits the signal to activate the next player's turn
    socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

//Discards the card from the board when the discard button is clicked and activates the next player's turn
function discardCard(){
  socket.emit("cardDiscarded",{});
  //Emits the signal to activate the next player's turn
  socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

function modify(stat,value){
  console.log(localPlayer.playerNum);
  var target, newValue, lol;
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
  var newValue, targetValue, newValues=[];
  targetValue = (stat==0) ? 'defense': 'attack';
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
socket.on("showCard",function(card){
  d3.select("#drawnCard").attr('xlink:href', card.path);

});
socket.on("discardCardAllClients",function(card){
    d3.select("#drawnCard").attr('xlink:href', "");
});
//Shows the active player's drawn card
socket.on("drawnCard", function(card){
  console.log("appel a drawCard");
    if (card.type == "event"){

      executeStringFunction(card.action);
      socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});

    }
    else {
      d3.select('#cardsPile')
      .on('click', null);
        var discard_button = document.getElementById("discard");
        discard_button.style.visibility = "visible";
        $(discard_button).removeAttr("disabled");

        $(discard_button).off("click").on("click",function(){
          discardCard();
        });

      if (localPlayer.hand.length<MAX_HAND_CARDS){

        var take_button = document.getElementById("take");
        $(take_button).off("click").on("click",function(){
          takeCard(card);
        });

        take_button.style.visibility = "visible";
        $(take_button).removeAttr("disabled");
      }
    }


});
