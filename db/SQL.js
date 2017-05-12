var SQL = function() {};

SQL.prototype = {
	setUser: function(name) {
		return 'SELECT userid, name FROM Users ' +
			   'WHERE name ="' + name + '"';
	},
	addUser: function(name) {
		return 'INSERT INTO Users (name) VALUE ("' + name + '")';
	},
	getProjectList: function(userid) {
		return 'SELECT P.pid, P.name ' +
			   'FROM Projects P, Involves I ' +
			   'WHERE P.pid = I.pid ' +
			     'AND I.uid ="' + userid + '"';
	},
	makeProject: function(project_name) {
		// Just make new Project, not add any member
		return 'INSERT INTO Projects (name) VALUE ("' + project_name + '")';
	},
	addProjectMember: function(pid, userid, username) {
		// pid MUST be required
		// only 1 of userid or username is required
		if (userid) {
			return 'INSERT INTO Involves (pid, uid) ' +
				   'VALUE ("' + pid + '", "' + userid + '")';
		} else {
			return 'INSERT INTO Involves (pid, uid) ' +
				   'SELECT "' + pid + '", uid ' +
				   'FROM Users ' +
				   'WHERE name = "' + username + '"';
		}
	},
	getSubsteps: function(userid) {	
		return 'SELECT P.pid, S.sid, P.name project_name, S.name ' +
			   'FROM Projects P, Substeps S, Involve_Substeps I ' +
			   'WHERE P.pid = S.pid ' +
			     'AND I.sid = S.sid ' +
			     'AND I.uid ="' + userid + '"';
	}
};



module.exports = SQL;