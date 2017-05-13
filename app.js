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
app.use(bodyParser.json());                     // using json for http body

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
    if(typeof req.session.username === 'undefined' || !req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
        return;
    }
    var msg = '';
    if(req.session.msg){                        // check session have message to client
        msg = req.session.msg;
        req.session.msg = false;
    }
    console.log('session user: ', req.session.username);
    console.log('session userid: ', req.session.userid);

    dbCon.query(sql.getProjectList(req.session.userid), function (err, projects) {
    	dbCon.query(sql.getSubsteps(req.session.userid), function (err, substeps) {
    		res.render('main', { projectList: projects, substepList: substeps, inviteList: [{ pid: 5, uid: 1}], msg: msg } );   // invitelist db 쿼리 추가 필요
		});
	});
});

app.get('/logout', function(req, res){
    if(typeof req.session.username === 'undefined' || !req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
    }

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
     if(typeof req.session.username === 'undefined' || !req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
    }

    if(req.query.projectname){
    	dbCon.query(sql.makeProject(req.query.projectname), function (err, okpacket) {
    		var statement = sql.addProjectMember(okpacket.insertId, req.session.userid, '');
    		dbCon.query(statement, function (err, okpacket) {
		    	res.redirect('/main');
    		});
		});
    }
})

app.get('/projects/:id', function(req,res){
    if(typeof req.session.username === 'undefined' || !req.session.username){                  // if not logged in, redirect to login page
        console.log('need to login');
        res.redirect('/');
    }
        var data = {                        // req.params.id == pid 조건 걸어서 project 디비에서 찾아서 보내줘야함
        pname : 'posrello',
        pid : req.params.id,
        userid: req.session.userid
    };
    res.render('project', data);
});

app.get('/acceptinvite/:id', function(req, res){
    // req.params.id 는 프로젝트 아이디고 해당 프로젝트에 req.session.userid써서 디비에  유저 추가해주어야 함 

    res.redirect('/main');
})


io.on('connection', function(socket){
    var pid;
    socket.on('add user', function(data){
        console.log(data.userid);
        socket.userid = data.userid;
        console.log('user connected: ', socket.userid);
        pid = data.pid;
        console.log(pid);
        socket.join(data.pid);
        var data = [   // data에 해당 pid로 substep 등 관련 정보 담아서 보내주어야 함.
            {
                sid: 1,
                work: 0,
                pid: 1,
                name: '메인 페이지 만들기'
            },
            {
                sid: 2,
                work: 1,
                pid: 1,
                name: '로그인 기능'
            },
            {
                sid: 2,
                work: 2,
                pid: 1,
                name: '프로젝트 만들기'
            }
        ];
        io.sockets.in(pid).emit('load data', data);

    });
   
    socket.on('invite user', function(data){
                                                // data.pid, data.username 써서 해당프로젝트 inviteList에 유저 추가해줘야함. 
    })

})

http.listen(3000, function(){
    console.log('Server On!');
});
