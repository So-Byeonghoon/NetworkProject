var SQL = function() {};

SQL.prototype = {
	setUser: function(name) {
		this.name = name;
		return 'SELECT userid, name FROM Users ' +
			   'WHERE name ="' + this.name + '"';
	},
	addUser: function(name) {
		this.name = name;
		return 'INSERT INTO Users (name) VALUE ("' + this.name + '")';
	}
};



module.exports = SQL;
