var express = require('express');
var path = require('path');
var app = express();
var mysql_dbc = require('./db/db_con')();
var db_connection = mysql_dbc.init();

mysql_dbc.test_open(db_connection);

app.set("view engine", 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

var data={count:0}
app.get('/', function (req, res) {
	data.count++;
	res.render('main.ejs', data);
});

app.get('/mysql/test', function (req, res) {
	var sql = 'select * from users';
	var data={uid:0, email:"NULL"}
	db_connection.query(sql, function (err, result) {
		if (!err) {
			// data.uid = result[0].uid;
			// data.email = result[0].email;
			data = result[0];
		}
		else
			console.log('MySQL error:', err);
		res.render('mysql_test.ejs', data);
	})
});


app.listen(3000, function() {
    console.log('server on!');
});