var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var DB = require('./db/db_con')();
var dbCon = DB.init();
var SQLSet = require('./db/SQL');
var sql = new SQLSet();

// check db connection
DB.test_open(dbCon);

app.use(session({ 
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());  // using json for http body

app.set("view engine", 'ejs');

app.use(express.static('public'));


app.get('/', function(req,res){
    // if already logged-in, redirect to main
    if(typeof req.session.username !== 'undefined' && req.session.username){
        console.log("can't acess login page");
        res.redirect('main');
        return;
    }
    res.render('login');
});

app.get('/login', function(req,res){
    // if already logged-in, redirect to main
    if(typeof req.session.username !== 'undefined' && req.session.username){
        console.log("can't acess login page");
        res.redirect('main');
        return;
    }
    
    function SignIn(req, callback) {
        dbCon.query(sql.setUser(req.query.username), function (err, rows) {
            if (Object.keys(rows).length) {
                req.session.username = rows[0].name;
                req.session.userid = rows[0].userid;
                res.redirect('/main');
            }
            else {
                callback(req);
            }
        });
    }
    SignIn(req, function (req) {
        dbCon.query(sql.addUser(req.query.username), function(err, rows) {
            SignIn(req, function(req) {});
        });
    });
});

app.get('/main', function(req,res){
    console.log("MAIN: " + req.session.username);
    // if not logged in, redirect to login page
    if(typeof req.session.username === 'undefined' || !req.session.username){
        console.log('need to login');
        res.redirect('/');
        return;
    }
    var msg = '';
    // check session have message to client
    if(req.session.msg){
        msg = req.session.msg;
        req.session.msg = false;
    }
    console.log('session user: ', req.session.username);
    console.log('session userid: ', req.session.userid);

    dbCon.query(sql.getProjectList(req.session.userid), function (err, projects) {
        dbCon.query(sql.getMySubsteps(req.session.userid), function (err, substeps) {
            dbCon.query(sql.getInviteList(req.session.userid), function (err, invites) {
                res.render('main', { projectList: projects, substepList: substeps, inviteList: invites, msg: msg } );
            });
        });
    });
});

app.get('/logout', function(req, res){
    // if not logged in, redirect to login page
    if(typeof req.session.username === 'undefined' || !req.session.username){
        console.log('need to login');
        res.redirect('/');
        return;
    }

    // if user logged-in, log out
    if(req.session.userid){
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
    // if not logged in, redirect to login page
     if(typeof req.session.username === 'undefined' || !req.session.username){
        console.log('need to login');
        res.redirect('/');
        return;
    }

    if(req.query.projectname){
        dbCon.query(sql.makeProject(req.query.projectname), function (err, okpacket) {
            var statement = sql.addProjectMember(okpacket.insertId, req.session.userid);
            dbCon.query(statement, function (err, okpacket) {
                res.redirect('/main');
            });
        });
    }
})

app.get('/projects/:id', function(req,res){
    // if not logged in, redirect to login page
    if(typeof req.session.username === 'undefined' || !req.session.username){
        console.log('need to login');
        res.redirect('/');
        return;
    }
    var data = {
        pid : req.params.id,
        userid: req.session.userid
    };
    dbCon.query(sql.getProjectName(data.pid), function (err, result) {
        if (err) {
            console.log('getProejct ERROR: '+err);
            res.redirect('/main');
        } else {
            data.pname = result[0].name;
            res.render('project', data);
        }
    });
});

app.get('/acceptinvite/:id', function(req, res){
    var pid = req.params.id;
    var uid = req.session.userid;
    dbCon.query(sql.checkInvite(pid, uid), function (err, result) {
        if (result[0].isInvited) {
            dbCon.query(sql.addProjectMember(pid, uid), function (err, okpacket) {
                if (err) {
                    console.log('addProjectMember ERROR: '+err);
                    res.redirect('/main');
                }else{
                    dbCon.query(sql.deleteInvite(pid, uid), function (err, okpacket) {
                        if (err) {
                            console.log('deleteInvite ERROR: '+err);
                        }
                        res.redirect('/main');
                    });
                }
            });
        }else{
            console.log("Didn't invited yet.");
            res.redirect('/main');
        }
    });
});


io.on('connection', function(socket){
    var pid;
    socket.on('add user', function(data){
        console.log(data.userid);
        socket.userid = data.userid;
        console.log('user connected: ', socket.userid);
        pid = data.pid;
        console.log(pid);
        socket.join(data.pid);
        dbCon.query(sql.getProjectSubsteps(data.pid), function (err, result) {
            // result = {sid, work, name} list
            console.log(result);
            io.sockets.in(pid).emit('load data', result);
        });
    });
   
    socket.on('invite user', function(data){
        dbCon.query(sql.makeInvite(data.pid, data.username), function (err, okpacket) {
            if (err) {
                console.log("Invite user ERROR: " + err);
            } else {
                console.log("Send Invitation to: " + data.username);
            }
        });
    });

    socket.on('make substep', function(data){
        dbCon.query(sql.makeSubstep(data.pid, data.substepname), function (err, okpacket) {
            dbCon.query(sql.getProjectSubsteps(data.pid), function (err, result) {
            // result = {sid, work, name} list
                console.log(result);
                io.sockets.in(pid).emit('load data', result);
            });
        });
    });

    socket.on('update substep', function(data) {
        dbCon.query(sql.changeSubstep(data.sid, data.work), function (err, okpacket) {
            // something
        });
    });
    

    socket.on('add user to substep', function(data){
            // data.sid, data.username 
    });

    socket.on('add detail to substep', function(data){
            // data.sid, data.detailname
    });

    socket.on('add comment to substep', function(data){
            // data.sid, data.comment
    });

    socket.on('finish detail', function(data){
            // data.sid, data.detailname
    });

http.listen(3000, function(){
    console.log('Server On!');
});
