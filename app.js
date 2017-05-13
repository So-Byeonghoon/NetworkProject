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
    		res.render('main', { projectList: projects, substepList: substeps, msg: msg } );
		});
	});
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
    	dbCon.query(sql.makeProject(req.query.projectname), function (err, okpacket) {
    		var statement = sql.addProjectMember(okpacket.insertId, req.session.userid, '');
    		dbCon.query(statement, function (err, okpacket) {
		    	res.redirect('/main');
    		});
		});
    }
})

http.listen(3000, function(){
    console.log('Server On!');
});
