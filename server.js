var nomsJoueurs = [];
var nbJoueursConnectes = 0;

var app = require('http').createServer(function(req, res){});
app.listen(8888);
var io = require("socket.io").listen(app);

io.sockets.on('connection', function (socket) {
  socket.on('etat', function(message) {
    var etat = {"nbJoueursConnectes":nbJoueursConnectes, "nomsJoueurs":nomsJoueurs};
    io.emit('etat', etat);
  });

  socket.on('rejoindre',function(message) {
    nomJoueur = message["nomJoueur"];
    nomsJoueurs.push(nomJoueur);
    io.emit('nouveauJoueur', {"numJoueur":nbJoueursConnectes, "nomJoueur":nomJoueur });
    nbJoueursConnectes++;
  });

  socket.on('quitter',function(message) {
    numJoueur = message["numJoueur"];
    nomsJoueurs.splice(numJoueur, 1);
    nbJoueursConnectes--;
    io.emit('ancienJoueur', message);
  });

});
