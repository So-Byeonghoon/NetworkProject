var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(session({ 
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());                     // using json for http body

app.set("view engine", 'ejs');

app.use(express.static('public'));
var users = ['kmnoh', 'bhsoh', 'dmpark'];
var projects = [{
    username : 'kmnoh',
    projectlist : ['posrello', 'network', 'pl']
},
{
    username : 'bhsoh',
    projectlist : ['posrelli', 'network']
},
{
    username : 'dmpark',
    projectlist : ['network', 'pl']
}];


app.get('/', function(req,res){
    if(req.session.username){                   // if already logged-in, redirect to main
        console.log("can't acess login page");
        res.redirect('main');
        return;
    }
    res.render('login');
});

app.get('/login', function(req,res){
    if(req.session.username){                   // if already logged-in, redirect to main
        console.log("can't acess login page");
        res.redirect('main');
        return;
    }
    
    if(users.indexOf(req.query.username) == -1){    // if user is not in DB, add user to DB
        users.push(req.query.username);
        console.log('add user', req.query.username);
    }
    req.session.username = req.query.username;
    res.redirect('/main');
});

app.get('/main', function(req,res){
    if(!req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
    }
    console.log('session user: ', req.session.username);
    for(i=0; i<users.length; i++){              // code for test user
        console.log(users[i]);
    }
    var data = {projectlist : []};
    console.log(data.projectlist);
    for(var i in projects){
        console.log(projects[i]);
        console.log(projects[i].username);
        if(projects[i].username == req.session.username) {
            data.projectlist = projects[i].projectlist;
        }
    }
    if(data.projectlist.length == 0){
    console.log(data.projectlist);
    } else {
        for(var i in data.projectlist) {
            console.log(data.projectlist[i]);
    }}
    res.render('main', data );
       
});

http.listen(3000, function(){
    console.log('Server On!');
});
