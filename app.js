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
var users = [
    {
        name: 'kmnoh',
        userid: 1
    },
    {
        name: 'bhsoh',
        userid: 2
    },
    {
        name: 'dmpark',
        userid: 3
    }
];        
var projects = [
    {
        pid: 1,
        name: 'posrello'
    },
    {
        pid: 2,
        name: 'network'
    },
    {
        pid: 3,
        name: 'trello'
    }
];
var involve = [
    {
        pid: 1,
        userid: 1
    },
    {
        pid: 1,
        userid: 2
    },
    {
        pid: 1,
        userid: 3
    },
    {
        pid: 2,
        userid: 1
    },
    {
        pid: 2,
        userid: 2
    },
    {
        pid: 3,
        userid: 1
    },
    {
        pid: 3,
        userid: 3
    }
];

var substeps = [
    {
        sid: 1,
        pid: 1,
        name: 'make main page',
        due: '20170509'
    }
]

var involveSubsteps = [
    {
        sid: 1,
        userid: 1
    }
]

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
    var num = 1;
    var userExisted = false;
    var currentUser = {};
    for(var i in users){                        // check user is in DB
        if(users[i].name == req.query.username){    
            userExisted = true;
            currentUser = users[i];
        }
        num++;
    }
    if(!userExisted){                            // if user is not in DB, add user to DB
        users.push({ 
            name: req.query.username,
            userid: num
        });
        currentUser = users.find(function(value){
            return value.name == req.query.username;
        })
        console.log('add user', req.query.username);
    }
    req.session.username = currentUser.name;
    req.session.userid = currentUser.userid;
    res.redirect('/main');
});

app.get('/main', function(req,res){
    if(!req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
    }
    var msg = '';
    if(req.session.msg){                        // check session have message to client
        msg = req.session.msg;
        req.session.msg = false;
    }
    console.log('session user: ', req.session.username);
    console.log('session userid: ', req.session.userid);
    var pidList = []; 
   for(var i in involve){                       // find project that user involved
        if(involve[i].userid == req.session.userid) {
            pidList.push(involve[i].pid);
        }
    }
    var projectList = projects.filter(function(value) { // find projectname that user involved
        for(var i in pidList){
            if(pidList[i] == value.pid){
                return true;
            }
        }
        return false;
    });

    var sidList = [];
    for(var i in involveSubsteps){              // find substep that user involved
        if(involveSubsteps[i].userid == req.session.userid){
            sidList.push(involveSubsteps[i].sid);
        }
    }

    var substepList = substeps.filter(function(value) { // find substepname that user involved
        for(var i in sidList){
            if(sidList[i] == value.sid){
                return true
            }
        }
        return false;
    })
    res.render('main', { projectList: projectList, substepList: substepList, msg: msg } );
       
});

app.get('/logout', function(req, res){
    if(req.session.userid){                                 // if user logged-in, log out
        req.session.destroy(function(err){                  
            if(err){
                console.log(err);
            }else{
                res.redirect('/');
            }
        })
    }else{
        res.redirect('/');
    }
})

app.get('/makeProject', function(req,res){
    if(req.query.projectname){
        var check =false
        for(var i in projects){                             // check that DB already have same name project
            if(projects[i].name == req.query.projectname){
                check = true;
                            }
        }
        if(check){                                          // if already have same name project, set error message
            req.session.msg ='same name';
            res.redirect('/main');
        }else{                                              // add project to DB
            projects.push({ pid : projects.length + 1, name: req.query.projectname });
            involve.push({ pid: projects.length, userid: req.session.userid });
            res.redirect('/main');
        }
    }else{
        res.redirect('/main');
    }
})

http.listen(3000, function(){
    console.log('Server On!');
});
