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
	addProjectMember: function(pid, userid) {
		return 'INSERT INTO Involves (pid, uid) ' +
			   'VALUE ("' + pid + '", "' + userid + '")';
	},
	makeInvite: function(pid, username) {
		return 'INSERT INTO Invites (pid, uid) ' + 
				   'SELECT "' + pid + '", userid ' +
				   'FROM Users ' +
				   'WHERE name = "' + username + '"';
	},
	checkInvite: function(pid, uid) {
		return 'SELECT count(*) isInvited FROM Invites ' + 
			   'WHERE pid = "' + pid + '" AND uid = "' + uid +'"';
	},
	deleteInvite: function(pid, uid) {
		return 'DELETE FROM Invites ' +
			   'WHERE pid = "' + pid + '" AND uid = "' + uid +'"';
	},
	getInviteList: function(userid) {
		//pid, uid, project_name
		return 'SELECT P.pid, I.uid, P.name project_name ' +
			   'FROM Projects P, Invites I ' +
			   'WHERE P.pid = I.pid ' +
			     'AND I.uid ="' + userid + '"';
	},
	getMySubsteps: function(userid) {	
		return 'SELECT P.pid, S.sid, P.name project_name, S.name ' +
			   'FROM Projects P, Substeps S, Involve_Substeps I ' +
			   'WHERE P.pid = S.pid ' +
			     'AND I.sid = S.sid ' +
			     'AND I.uid ="' + userid + '"';
	},
	getProjectSubsteps: function(pid) {
		return 'SELECT S.sid, S.name, ' + 
					  'COALESCE(sum(D.finished), 0) done, ' + 
					  'COALESCE(count(D.name)-sum(D.finished), 0) todo ' +
			   'FROM Substeps S ' +
			   	   'LEFT OUTER JOIN Details D ' +
			   	     'ON S.sid = D.sid ' +
			   'WHERE S.pid = "' + pid + '" ' +
			   'GROUP BY S.sid, S.name';
	},
	getProjectName: function(pid) {
		return 'SELECT name FROM Projects WHERE pid="' + pid + '"';
	},
	makeSubstep: function(pid, name) {
		return 'INSERT INTO Substeps (pid, name, work) ' +
			   'VALUE ("' + pid + '", "' + name + '", 0)';
	},
	addSubstepMember: function(sid, username) {
		return 'INSERT INTO Involve_Substeps (uid, sid) ' +
			   		'SELECT userid, "' + sid + '" ' +
			   		'FROM Users ' +
			   		'WHERE name = "' + username + '"';
	},
	addDetail: function(sid, detailname) {
		return 'INSERT INTO Details (sid, name, finished) ' + 
			   'VALUE ("' + sid + '", "' + detailname + '", 0)';
	},
	addComment: function(sid, content) {
		return 'INSERT INTO Comments (sid, contents) ' +
			   'VALUE ("' + sid + '", "' + content + '")';
	},
	finishDetail: function(sid, detailname) {
		return 'UPDATE Details ' +
			   'SET finished = 1 ' +
			   'WHERE sid= "' + sid + '" ' +
			     'AND name = "' + detailname + '"';
	}
};



module.exports = SQL;