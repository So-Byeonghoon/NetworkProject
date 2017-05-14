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

    function sendProjectData(pid){
        dbCon.query(sql.getProjectSubsteps(pid), function (err, result) {
            // result = {sid, name, todo, done} list
            console.log(result);
            io.sockets.in(pid).emit('load data', result);
        });
    };

    socket.on('add user', function(data){
        console.log(data.userid);
        socket.userid = data.userid;
        console.log('user connected: ', socket.userid);
        pid = data.pid;
        console.log(pid);
        socket.join(data.pid);
        console.log("get Project's Substep SQL: " +sql.getProjectSubsteps(data.pid));
        sendProjectData(pid);
        /*
        dbCon.query(sql.getProjectSubsteps(data.pid), function (err, result) {
            // result = {sid, name, todo, done} list
            console.log(result);
            io.sockets.in(pid).emit('load data', result);
        });*/
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
            console.log('Make Substep: '+okpacket);
            sendProjectData(pid);
            // dbCon.query(sql.getProjectSubsteps(data.pid), function (err, result) {
            // // result = {sid, name, todo, done} list
            //     console.log('Project Substeps: '+result);
            // });
        });
    });

    socket.on('leave substep', function(data){
        socket.leave(pid+" "+data.sid);
        socket.join(pid);
        
        console.log(pid+" "+data.sid);
        dbCon.query(sql.getProjectSubsteps(pid), function (err, result) {
            // result = {sid, name, todo, done} list
            console.log(result);
            io.sockets.in(pid).emit('load data', result);
        });

    })

    socket.on('get substep', function(data){
        socket.leave(pid);
        socket.join(pid+" "+data.sid);
        console.log("leave room", pid);
        sendSubstepData(data.sid);
    });
    
    function sendSubstepData(sid){
        var data ={
            substepInfo: [],    // substepInfo = {sid, substep_name, project_name}
            detailList: [],     // details = {name, finished} list
            memberList: [],     // members = {name} list
            commentList: []     // comments = {contents} list
        };
        console.log("sid: ", sid);
        dbCon.query(sql.getDetails(sid), function (err, details) {
            data.detailList = details;
            dbCon.query(sql.getSubstebMembers(sid), function (err, members) {
                data.memberList = members;
                dbCon.query(sql.getComments(sid), function (err, comments) {
                    data.commentList = comments;
                    dbCon.query(sql.getSubstepInfo(sid), function (err, info) {
                        data.substepInfo = info[0];
                        console.log(data);
                        io.sockets.in(pid +" "+ sid).emit('load substep', data);
                    });
                });
            });
        });
    };

    socket.on('add user to substep', function(data){
        console.log(data.sid);
        console.log(data.username);
        dbCon.query(sql.addSubstepMember(data.sid, data.username), function (err, okpacket) {
            console.log("ADD Substep: "+okpacket);
        });

        sendSubstepData(data.sid);
    });

    socket.on('add detail to substep', function(data){
        dbCon.query(sql.addDetail(data.sid, data.detailname), function (err, okpacket) {
            console.log("ADD Detail: "+okpacket);
        });

        sendSubstepData(data.sid);
    });

    socket.on('add comment to substep', function(data){
        dbCon.query(sql.addComment(data.sid, data.comment), function (err, okpacket) {
            console.log("ADD Comment: "+okpacket);
        });

        sendSubstepData(data.sid);
    });

    socket.on('finish detail', function(data){
        dbCon.query(sql.finishDetail(data.sid, data.detailname), function (err, okpacket) {
            console.log("Finish Detail: "+okpacket);
        });

        sendSubstepData(data.sid);
        sendProjectData(pid);
    });
});

http.listen(3000, function(){
    console.log('Server On!');
});
