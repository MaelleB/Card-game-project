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

/*CONNECTION/JOINING/QUITTING/CHATTING FUNCTIONS
===============================================*/

//receives state data from server and updates client-side data
socket.on("etat", function(state_data) {
  for (let d in state_data) {
    if (d == "players"){
      console.log("players: " + players);
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
    var playerName = document.getElementById("playerName").value;
    d3.select("#equipped"+nbOfPlayers).append('svg')
                                       .attr('id', 'svgEquipped'+nbOfPlayers);

    if (nbOfPlayers < MAX_PLAYERS_NB) {
      if (!checkPseudo(playerName, players)) {

        localPlayer.playerNum = nbOfPlayers;
        localPlayer.aliasName = playerName;
        localPlayer.hand = [];
        localPlayer.nbEquippedCards = 0;
        players.push(playerName);
        nbOfPlayers++;

        $("#join").attr("disabled", "disabled");
        $("#quit").removeAttr("disabled");
        $("#playerName").attr("disabled", "disabled");
        $("#playerName").val("");
        $("#hand").removeAttr("disabled");
        $("#chatForm").removeAttr("disabled");
        $("#chatForm").css("visibility", "visible");

        document.title = playerName + " - " + document.title;
        socket.emit("rejoindre",
        {
          "playerNum": localPlayer.playerNum,
          "playerName": playerName
        });
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
  if (player_data.signalType == "socket"){
    localPlayer.attack = player_data.playerAttack;
    localPlayer.defense = player_data.playerDefense;

    insertMessage("em", "Vous", "avez rejoint le jeu");

    /*
    inserts the chat message in the chat zone upon clicking the submit button of the form
    sends it to the server to be broadcasted for the other players
    */
    $("#chatForm").submit(function(){
      var chatMessage = $("#chatMessage").val();
      socket.emit("chatMessage",
      {
        "chatMessage": chatMessage,
        "playerName": localPlayer.aliasName
      });
      insertMessage("strong", localPlayer.aliasName, chatMessage);
      $("#chatMessage").val("");
      return false;
    });
  }
  else
    insertMessage("em", player_data.playerName, "a rejoint le jeu");
});

function insertMessage(emphasis, alias, message){
  $("#messageZone").prepend("<p><"+emphasis+">" + alias + "</"+emphasis+"> " + message + "</p>");
}

socket.on("chatMessage", function(data){
  insertMessage("strong", data.playerName, data.chatMessage);
});

//sets timer for local player turn (1 minute)
function beginCount(){
   timeCount = setTimeout(function(){
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
  if (localPlayer.playerNum == status_data.playerNum)
    localPlayer.status = status_data.playerStatus;
  showHand();

  if(status_data.playerStatus == 1) {
      console.log("Tour du joueur " + status_data.playerName);
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
  endCount();

  if (localPlayer.playerNum > -1) {
    console.log("Suppression du joueur n." + localPlayer.playerNum + " ayant le pseudo " + localPlayer.aliasName);

    $("#join").removeAttr("disabled");
    $("input[name=player]").removeAttr("disabled");
    $("#quit").attr("disabled", "disabled");
    $("#draw").attr("disabled", "disabled");
    $("#chatForm").attr("disabled", "disabled");
    $("#chatForm").css("visibility", "hidden");
    document.getElementById("messageZone").innerHTML = "";

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

//function called when the page loads
window.onload = function(){

  //emit signal to load the map data
  socket.emit("loadMap");

  //creates svg zone to display svg elements with D3
  var svg = d3.select('#svgWin')
              .append('svg')
              .attr('width', 900)
              .attr('height', 650);

  //creates the svg:image to display the drawn card
  var drawn_card = svg.append('svg:image')
                      .attr('id', 'drawnCard')
                      .attr('x', 390)
                      .attr('y', 170)
                      .attr('width', '200')
                      .attr('height', '310');

  //creates and displays the svg:image for the cards pile
  svg.append('svg:image')
     .attr('id', 'cardsPile')
     .attr('x', 10)
     .attr('y', 300)
     .attr('width', 150)
     .attr('height', 232)
     .attr('xlink:href', 'images/cardback.png')
     .on('click', null);

  //moves an element to the front
  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  }

  //moves an element to the back
  d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
      var firstChild = this.parentNode.firstChild;
      if (firstChild) {
        this.parentNode.insertBefore(this, firstChild);
      }
    });
  }

  //creates the svg:image elements for the cards the local player has in his hand
  for(let i=0; i<MAX_HAND_CARDS; i++){
    svg.append('svg:image')
       .attr('id','hand'+i)
       .attr('height', 150)
       .attr('width', 100)
       .attr('x', 300)
       .attr('y', 490)
       .attr('xlink:href', '')
       //zoom on mouseover
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

  //creates svg zones for equipped cards
  for(let i=0; i<MAX_PLAYERS_NB; i++){
    d3.select("#equipped"+i).append('svg')
                                       .attr('id', 'svgEquipped'+i);

    $("#player"+i).hover(function(){
      $("#equipped"+i).css({"opacity":1, "z-index":1});
    }, function(){
      $("#equipped"+i).css({"opacity":0, "z-index":-1});
    });
  }
}

//client receives map data from server and stores it in the map variable
socket.on("mapLoaded", function(map_data){
  console.log("Map loaded");
  map = map_data;
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

// creates the hexagons composing the map

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

  //creates a repeated hexagon pattern
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

      //different colors on the map tiles depending on the environment
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

  //creates the circle to indicate current position on the map
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

/*
  enables buttons to go to the direction passed as argument
  if player clicks on button, sends signal to the server to change current tile
 */
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

//disables a direction button
function disablesDirection(direction){
  var button = document.getElementById(direction);

  button.style.visibility = "hidden";
  $(button).attr("disabled");
}

//changes the current map tile according to direction chosen by player
socket.on("changeMapTile", function(direction) {
  console.log("Dans ChangeMapTile");
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

      if (localPlayer.hand.length < (MAX_HAND_CARDS + localPlayer.nbEquippedCards)){
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

  if (localPlayer.hand){
    var currentCard, cardNum = -1;
  	for(let i=0; i<localPlayer.hand.length; i++){
      currentCard = localPlayer.hand[i];
      if (!currentCard.isEquipped){
        cardNum++;
        d3.select('#hand'+cardNum)
    		  .attr('xlink:href', currentCard.path)
          .attr('x', (cardNum+1)*(900/(2*(localPlayer.hand.length + 1 - localPlayer.nbEquippedCards))+30)+160);
    		initCardActions(currentCard, cardNum);
      }
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
  $("#discard").attr("disabled", "disabled");
  $("#discard").css("visibility", "hidden");
  $("#take").attr("disabled", "disabled");
  $("#take").css("visibility", "hidden");
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
  $("#discard").attr("disabled", "disabled");
  $("#discard").css("visibility", "hidden");
  $("#take").attr("disabled", "disabled");
  $("#take").css("visibility", "hidden");
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
  socket.emit("addEquippedCard", { "card" : card, "player" : localPlayer});
  localPlayer.nbEquippedCards++;
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

socket.on("addEquippedCard", function(data){
  var playerNumber = 0;

  while((data.player).aliasName != players[playerNumber]){
    playerNumber++;
  }

  d3.select("#svgEquipped"+playerNumber).append('svg:image')
                                     .attr('height', 150)
                                     .attr('width', 80)
                                     .attr('xlink:href', (data.card).path);
});

//exchanges a card in hand with an equipped card (cards of type "wearable")
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
      //console.log("key: " + ev.keyCode);
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
          if (card.type == "wearable" && localPlayer.nbEquippedCards <= MAX_EQUIPPED_CARDS){
            var equipped_cards = equippedCards(), i=0;
            while (i < equipped_cards.length && card.category != equipped_cards[i].category)
              i++;
            if (i==equipped_cards.length)
              equipCard(card);
          }
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
