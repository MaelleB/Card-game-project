var socket;
var nbJoueursConnectes = 0;
var nomsJoueurs = [];
var joueurLocal = -1;      // indice dans nomsJoueurs

function rejoindrePartie() {
  if (joueurLocal == -1) {
    nomJoueur = document.getElementsByName('joueur')[0].value;
    if (nbJoueursConnectes < 4) {
      if (nomJoueur != "") {
        console.log("Envoi de la connexion");
        socket.emit("rejoindre", { "nomJoueur": nomJoueur });
        joueurLocal = nbJoueursConnectes;
      }
    }
    else {
      console.log("Vous ne pouvez pas pour l'instant rejoindre le groupe !");
    }
  }
}

function quitterPartie() {
  console.log("Dans quitterPartie");
  if (joueurLocal > -1) {
    console.log("Suppression du joueur n."+joueurLocal);
    socket.emit("quitter", { "numJoueur": joueurLocal} );
  }
}

socket = io('http://localhost:8888');
socket.emit("etat",{});  // Pour que le serveur renvoie les noms des joueurs déjà connectés

socket.on("etat", function(data) {
  console.log("Dans la réception d'état");
  for (var m in data) {
    console.log(m+" : "+data[m]);
    window[m] = data[m];  // MAGIQUE
    for (var i=0; i < nomsJoueurs.length; i++) {
      console.log("joueur ="+nomsJoueurs[i]);
      document.getElementById("joueur"+i).innerHTML = nomsJoueurs[i];
    }
  }
});

socket.on("nouveauJoueur", function(data) {
  console.log("Du serveur : nouveau joueur");
  nomsJoueurs.push(data["nomJoueur"]);
  document.getElementById("joueur"+nbJoueursConnectes).innerHTML = data["nomJoueur"];
  nbJoueursConnectes++;
});

socket.on("ancienJoueur", function(data) {
  var numJoueur = data['numJoueur'];
  var ancienJoueur = nomsJoueurs[numJoueur];
  console.log("Du serveur ancienJoueur = "+ancienJoueur+" (joueur n."+numJoueur+")");
  if (joueurLocal == numJoueur){
    joueurLocal = -1;
  }
  else if (joueurLocal > 0){
    joueurLocal--;
  }
  console.log("JoueurLocal = "+joueurLocal);
  nomsJoueurs.splice(numJoueur, 1);
  nbJoueursConnectes--;
  for (var i=numJoueur; i < nbJoueursConnectes; i++){
    document.getElementById("joueur"+i).innerHTML = nomsJoueurs[i];
  }
  document.getElementById("joueur"+i).innerHTML = "";
});
