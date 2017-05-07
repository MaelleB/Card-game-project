/*GLOBAL VARIABLES*/
var socket, timeCount,
  nbOfPlayers = 0, players = [],
  localPlayer = {"playerNum": -1},
  map, currentTile, currentPosX, currentPosY;

/*CONSTANTS*/
var MAX_PLAYERS_NB = 5,
  MAX_EQUIPPED_CARDS = 4,
  MAX_HAND_CARDS = 5;

//connects client to the server and sends state data
socket = io("http://localhost:8888");
socket.emit("etat");

/*CONNECTION/JOINING/QUITTING FUNCTIONS
=======================================*/

//receives state data from server and updates client-side data
socket.on("etat", function(state_data) {
  for (let d in state_data) {
    if (d == "players"){
      var pl = state_data[d];
      if (pl.length){
        for (let i=0; i<pl.length; i++){
          if (!players.includes(pl[i].aliasName))
            players.push(pl[i].aliasName);

          document.getElementById("player"+i).innerHTML = pl[i].aliasName;
					document.getElementById("attack"+i).innerHTML = pl[i].attack;
					document.getElementById("defense"+i).innerHTML = pl[i].defense;
				}
			}
		}
		else
			window[d] = state_data[d];
	}
});

//checks if player's pseudo is unique
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

//local player joins the game
function rejoindrePartie() {
  if (localPlayer.playerNum == -1) {
    var playerName = document.getElementsByName("player")[0].value;
    console.log("players: " + players);

    if (nbOfPlayers < MAX_PLAYERS_NB) {
      if (!checkPseudo(playerName, players)) {

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
  adds a player to the game:
  - adds the player's name to the players array
  - shows the player's name, attack and defense in client's window
*/
socket.on("newPlayer", function(player_data) {
  console.log(player_data.playerName + " a rejoint le jeu");

  players.push(player_data.playerName);
  localPlayer.aliasName = player_data.playerName;
  localPlayer.attack = player_data.playerAttack;
  localPlayer.defense = player_data.playerDefense;
  localPlayer.hand = [];
  localPlayer.nbEquippedCards = 0

  document.getElementById("player"+nbOfPlayers).innerHTML = player_data.playerName;
  document.getElementById("attack"+nbOfPlayers).innerHTML = player_data.playerAttack;
  document.getElementById("defense"+nbOfPlayers).innerHTML = player_data.playerDefense;

  nbOfPlayers++;
});

//sets timer for local player turn (15 seconds)
function beginCount(){
   timeCount = setTimeout(function(){
     console.log("passage automatique");
     socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
     endCount();
   }, 60000);
}

//clears timer for local player
function endCount(){
  clearTimeout(timeCount);
}

/*
  receiving the player's turn status:
  - if it's the local player's turn, enables the onClick event on the pile to draw a card and triggers the turn timer
  - else, disables it
*/
socket.on("status", function(status_data) {
  localPlayer.status = status_data.playerStatus;
  showHand();

  if(status_data.playerStatus == 1) {
      console.log("Tour du joueur " + status_data.playerName);
      // For testing purposes it's actually 15 secondes
      console.log(status_data.playerName+" a 1 minute pour jouer");

      if(status_data.playerNum == localPlayer.playerNum){
        d3.select('#cardsPile').on('click', drawCardClient);
        beginCount();
      }
  }
  else{
    if(status_data.playerNum == localPlayer.playerNum){
      document.getElementById("take").style.visibility = "hidden";
      $("#take").attr("disabled", "disabled");

      document.getElementById("discard").style.visibility = "hidden";
      $("#discard").attr("disabled", "disabled");
      d3.select('#cardsPile').on('click', null);
    }
  }
});

//local player quits the game
function quitterPartie() {
  console.log("Dans quitterPartie");
  endCount();

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
removing a player from the game:
  - removes the name from the players array
  - removing the name, attack and defense from the html page
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
/*=====================================================================*/
/*MAP FUNCTIONS
===============*/

/*@Maëlle: Missing description*/
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

  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  }

  d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
      var firstChild = this.parentNode.firstChild;
      if (firstChild) {
        this.parentNode.insertBefore(this, firstChild);
      }
    });
  }

  for(let i=0; i<MAX_HAND_CARDS; i++){
    svg.append('svg:image')
       .attr('id','hand'+i)
       .attr('height', 150)
       .attr('width', 100)
       .attr('x', 300)
       .attr('y', 490)
       .attr('xlink:href', '')
       .on('mouseover', function(){
         d3.select(this)
           .attr('height', 250)
           .attr('width', 166)
           .attr('y', 410)
           .moveToFront();
       })
       .on('mouseout', function(){
         d3.select(this)
           .attr('height', 150)
           .attr('width', 100)
           .attr('y', 490)
           .moveToBack();
       });
  }
}

//client receives map data from server and stores it in the map variable
socket.on("mapLoaded", function(map_data){
  console.log("Map loaded");
  map = map_data;
  console.log(map);
  currentTile = map[0][0];
  currentPosX = 0;
  currentPosY = 0;
  document.getElementById("gameWindow")
          .style.backgroundImage = "url("+currentTile.background+")";
  socket.emit("drawMap");
});

//creates a hexagon
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

/*
- creates the hexagons composing the map
- function createMapHexagons(radius, lines, columns)
*/
socket.on("drawMap", function(radius, lines, columns){
  var dist = radius - (Math.sin(Math.PI/3)*radius),
      positionX = 18, positionY = 20;

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
                            .attr('fill', 'rgba(77, 209, 63, 0.5)')
                            .attr('id', l+':'+c);
      }

      if(map[l][c].environment == "forest"){
        d3.select('#svgMap').append('path')
                            .attr('d', d)
                            .attr('stroke', 'black')
                            .attr('fill', 'rgba(6, 169, 11, 0.5)')
                            .attr('id', l+':'+c);
      }

      if(map[l][c].environment == "encounter"){
        d3.select('#svgMap').append('path')
                            .attr('d', d)
                            .attr('stroke', 'black')
                            .attr('fill', 'rgba(181, 3, 3, 0.5)')
                            .attr('id', l+':'+c);
      }
    }
  }

  d3.select('#svgMap').append('circle')
                      .attr('id', 'positionMarker')
                      .attr('cx', positionX)
                      .attr('cy', positionY)
                      .attr('r', 7)
                      .attr('fill', 'rgb(53, 0, 0)');
});

//Changes the current tile if its environment is the right one
function changeTile(env){
  if(currentTile.environment == env){
    if(currentPosY > 0){
      toDirection("up");
    }

    if(currentPosX < 5){
      toDirection("right");
    }

    if(currentPosY < 4){
      toDirection("down");
    }

  }
  else{
    console.log("Wrong environment - card cannot be used for this one");
  }
}

/*@Maëlle: Missing description*/
function toDirection(direction){
  var button = document.getElementById(direction);

  button.style.visibility = "visible";
  $(button).removeAttr("disabled");
  $(button).on("click", function(){
    socket.emit("changeTile", direction);
    button.style.visibility = "hidden";
    $(button).attr("disabled");
    disablesDirection("up");
    disablesDirection("down");
    disablesDirection("right");
  });
}

/*@Maëlle: Missing description*/
function disablesDirection(direction){
  var button = document.getElementById(direction);

  button.style.visibility = "hidden";
  $(button).attr("disabled");
}

/*@Maëlle: Missing description*/
socket.on("changeMapTile", function(direction) {
  var newX = currentPosX, newY = currentPosY;

  if(direction == "up"){
    newY--;
    d3.select("#positionMarker").node().cx.baseVal.value += 17;
    d3.select("#positionMarker").node().cy.baseVal.value -= 30;
  }

  else if(direction == "right"){
    newX++;
    d3.select("#positionMarker").node().cx.baseVal.value += 34;
  }

  else{
    newY++;
    d3.select("#positionMarker").node().cx.baseVal.value += 17;
    d3.select("#positionMarker").node().cy.baseVal.value += 30;
  }

  currentTile = map[newY][newX];
  currentPosX = newX;
  currentPosY = newY;
  document.getElementById("gameWindow").style.backgroundImage = "url("+currentTile.background+")";

  if(localPlayer.status != 1){
    disablesDirection("up");
    disablesDirection("down");
    disablesDirection("right");
  }
});
/*=====================================================================*/
/*CARD FUNCTIONS
================*/

//activates the server-side card drawing phase
function drawCardClient(){
	socket.emit("drawCard");
}

//initializes take/discard buttons upon drawing a card
socket.on("drawnCard", function(card){
    if (card.type == "event"){
      executeStringFunction(card.action);
      document.getElementById("take").style.visibility = "hidden";
      $("#take").attr("disabled", "disabled");

      document.getElementById("discard").style.visibility = "hidden";
      $("#discard").attr("disabled", "disabled");
      socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
      endCount();
    }

    else {
      d3.select('#cardsPile').on('click', null);
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

//shows the active player's hand
function showHand(){
	for(let i=0; i<MAX_HAND_CARDS; i++)
		d3.select('#hand'+i).attr('xlink:href', '');

	var currentCard;
	for(let i=0; i<localPlayer.hand.length; i++){
    currentCard = localPlayer.hand[i];
    if (!currentCard.isEquipped){
      d3.select('#hand'+i)
  		  .attr('xlink:href', currentCard.path)
        .attr('x', i*(900/(2*localPlayer.hand.length)+30)+160);
  		initCardActions(currentCard, i);
    }
	}
}

//shows drawn card for all players
socket.on("showCard", function(card){
  d3.select("#drawnCard").attr('xlink:href', card.path);
});

//discards drawn card for all players
socket.on("discardCardAllClients", function(){
  d3.select("#drawnCard").attr('xlink:href', "");
});

/*
- adds the card to the hand when the take button is clicked
- discards the card from the game board
- activates the next player's turn
*/
function takeCard(card){
  card.isEquipped = false;
  localPlayer.hand.push(card);
  socket.emit("cardTaken", {card: card, playerNum: localPlayer.playerNum});
  endCount();

  //emits the signal to activate the next player's turn
  socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
}

/*
- discards the card from the board
- activates the next player's turn
*/
function discardCard(){
  socket.emit("cardDiscarded");

  //emits the signal to activate the next player's turn
  socket.emit("playerTurn", {"playerNum": localPlayer.playerNum});
  endCount();
}

//executes a function whose name is passed as a string parameter
function executeStringFunction(func_string){
  var function_name = func_string.split("(")[0];
  var arguments_string = func_string.split("(")[1];
  var arguments_array = arguments_string.split(",");
  var last_element = arguments_array[arguments_array.length-1].split(")")[0];
  arguments_array.pop();
  arguments_array.push(last_element.trim());
  window[function_name].apply(this, arguments_array);
}

//modifies statistics of localPlayer
function modify(stat, value){
  var target, newValue, statString;
  statString = (stat==0)? 'defense'+localPlayer.playerNum : 'attack'+localPlayer.playerNum;
  target = document.getElementById(statString);
  newValue = parseInt(target.innerHTML) + parseInt(value);

  //checking if newValue is negative
  if(newValue<0) newValue = 0;
  stat==0? localPlayer.defense = newValue : localPlayer.attack = newValue;
  target.innerHTML = newValue;
  socket.emit("modify",
    {
      "targetStat": stat,
      "newValue": newValue,
      "playerNum": localPlayer.playerNum
    });
}

//modifies statistics of all players
function modifyAll(stat, value){
  var newValue, targetValue, target, newValues=[];
  targetValue = (stat==0)? 'defense' : 'attack';

  for (let i=0; i<players.length; i++){
    target = document.getElementById(targetValue+i);
    newValue = parseInt(target.innerHTML) + parseInt(value);
    if (newValue<0) newValue = 0;
    newValues.push(newValue);
  }

  socket.emit("modifyAll",
  {
    "targetStat": stat,
    "newValues": newValues
  });
}

socket.on("modifyLocalStat", function(new_data){
  new_data["targetStat"] == 0?
    localPlayer.defense = new_data["newValues"][localPlayer.playerNum] :
    localPlayer.attack = new_data["newValues"][localPlayer.playerNum];
});

//uses card (of type usable)
function useCard(card){
	executeStringFunction(card.action);

  var indexC = localPlayer.hand.indexOf(card);
  socket.emit("modifyCard",
  {
    "playerNum": localPlayer.playerNum,
    "card": card,
    "indexC": indexC,
    "functionName": "use"
  });

	localPlayer.hand.splice(indexC, 1);
	showHand();
}

//tosses card (of any type)
function tossCard(card){
  socket.emit("modifyCard",
  {
    "playerNum": localPlayer.playerNum,
    "card": card,
    "indexC": localPlayer.hand.indexOf(card),
    "functionName": "toss"
  });

	var indexC = localPlayer.hand.indexOf(card);
	localPlayer.hand.splice(indexC, 1);
	showHand();
}

//equips card (of type wearable)
function equipCard(card){
  executeStringFunction(card.action);
  socket.emit("modifyCard",
  {
    "playerNum": localPlayer.playerNum,
    "card": card,
    "indexC": localPlayer.hand.indexOf(card),
    "functionName": "equip"
  });
  card.isEquipped = true;
  showHand();
}

//returns the index of a card in a hand
function indexCard(hand, card){
  for (let i=0; i<hand.length; i++)
    if (JSON.stringify(hand[i]) == JSON.stringify(card))
      return i;
  return -1;
}

//returns the array of equipped cards in the hand
function equippedCards(){
  var equipped_cards = [], currentCard;
  for (let i=0; i<localPlayer.hand.length; i++){
    currentCard = localPlayer.hand[i];
    if (currentCard.isEquipped)
      equipped_cards.push(currentCard);
  }
  return equipped_cards;
}

function exchangeCard(card){
  var equipped_cards = equippedCards();

  if (equipped_cards.length){
    var i=0;
    while (i < equipped_cards.length && equipped_cards[i].category != card.category)
      i++;
    if (i == equipped_cards.length)
      equipCard(card);
    else {
      var equCard = equipped_cards[i],
        indexEquC = indexCard(localPlayer.hand, equCard),
        indexC = localPlayer.hand.indexOf(card),
        equCardInHand = localPlayer.hand[indexEquC],
        equCardAddedStat = "", equCardAddedStatValue;

      i = 1;
      while (equCardInHand.action[equCardInHand.action.length - 1 - i] != " "){
        /*getting the value of the equipped card's argument of the action function*/
        equCardAddedStatValue = equCardInHand.action[equCardInHand.action.length - 1 - i] + equCardAddedStatValue;
        i++;
      }

      equCardAddedStat = equCardInHand.action[equCardInHand.action.indexOf("(") + 1] == 1? 'attack' : 'defense';

      var localStatValue = document.getElementById(equCardAddedStat+localPlayer.playerNum).innerHTML;
      localStatValue = parseInt(localStatValue) - parseInt(equCardAddedStatValue);
      document.getElementById(equCardAddedStat+localPlayer.playerNum).innerHTML = localStatValue;

      equCardInHand.isEquipped = false;
      card.isEquipped = true;
      if (equCardAddedStat == "defense")
        localPlayer.defense -= parseInt(equCardAddedStatValue);
      else
        localPlayer.attack -= parseInt(equCardAddedStatValue);

      executeStringFunction(card.action);
      socket.emit("modifyCard",
      {
        "playerNum": localPlayer.playerNum,
        "card": card,
        "indexC": indexC,
        "indexEquC": indexEquC,
        "functionName": "exchange"
      });
      showHand();
    }
  }
  //else equipCard(card);
}

//initialises card at index in hand with functions (use, toss, etc..)
function initCardActions(card, index){

	$("#hand"+index).off("focus").on("focus", function(e){
    $(e.currentTarget).off("keypress").on("keypress", function(ev){
      console.log("key: " + ev.keyCode);
      switch(ev.keyCode){
        case 117: // "u" key
        case 85: // "U" key
          if (card.type == "usable")
            useCard(card);
          break;

        case 116: // "t" key
        case 84: // "T" key
          tossCard(card);
          break;

        case 101: // "e" key
        case 69: // "E" key
          if (card.type == "wearable")
            equipCard(card);
          break;

        case 120: // "x" key
        case 88: // "X" key
          if (card.type == "wearable")
            exchangeCard(card);
          break;
        default: return;
      }
    });
	});
}
