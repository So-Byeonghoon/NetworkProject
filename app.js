var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set("view engine", 'ejs');

app.use(express.static('public'));

app.get('/', function(req,res){
    res.render('login');
});


http.listen(3000, function(){
    console.log('Server On!');
});
