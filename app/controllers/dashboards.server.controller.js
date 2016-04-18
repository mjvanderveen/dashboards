'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Dashboard = mongoose.model('Dashboard'),
	_ = require('lodash');

/**
 * Get the error message from error object
 */
var getErrorMessage = function(err) {
	var message = '';

	if (err.code) {
		switch (err.code) {
			case 11000:
			case 11001:
				message = 'Dashboard already exists';
				break;
			default:
				message = 'Something went wrong';
		}
	} else {
		for (var errName in err.errors) {
			if (err.errors[errName].message) message = err.errors[errName].message;
		}
	}

	return message;
};

/**
 * Create a dashboard
 */
exports.create = function(req, res) {
	var dashboard = new Dashboard(req.body);
	dashboard.user = req.user;

	dashboard.save(function(err) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp(dashboard);
		}
	});
};

/**
 * Show the current dashboard
 */
exports.read = function(req, res) {
	res.jsonp(req.dashboard);
};

/**
 * Update a dashboard
 */
exports.update = function(req, res) {
	var dashboard = req.dashboard;

	dashboard = _.extend(dashboard, req.body);

	dashboard.save(function(err) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp(dashboard);
		}
	});
};

/**
 * Delete an dashboard
 */
exports.delete = function(req, res) {
	var dashboard = req.dashboard;

	dashboard.remove(function(err) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp(dashboard);
		}
	});
};

/**
 * List of Dashboards
 */
exports.list = function(req, res) {
	
	// If user is not logged in, add criteria for selecting public dashboards only
	var criteria = '';
	if (typeof(req.user) === 'undefined') {
		criteria = { 'isPublic': true} ;
	}
	
	Dashboard.find(criteria).sort('-created').populate('user', 'displayName').exec(function(err, dashboards) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp(dashboards);
		}
	});
};

/**
 * Dashboard middleware
 */
exports.dashboardByID = function(req, res, next, id) {
	var _id = mongoose.Types.ObjectId(id);
	
	// If user is not logged in, add criteria for selecting public dashboards only
	var criteria = {'_id': _id};
	if (typeof(req.user) === 'undefined') {
		criteria = { '_id': _id, 'isPublic': true} ;
	} else {
		exports.hasAuthorization(req,res,next);
	}
	
	Dashboard.findOne(criteria).populate('user', 'displayName').exec(function(err, dashboard) {
		if (err) return next(err);
		if (!dashboard) return res.send(400, { message: 'Failed to load dashboard: ' + id });
		req.dashboard = dashboard;
		next();
	});
};

/**
 * Dashboard authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {
	var _this = this;
	var dashboard = req.dashboard;

	//if public, then continue
	if (dashboard.isPublic){
		next();
	}
	// otherwise check if logged in
	
	exports.requiresLogin(req, res, function() {
		if (_.intersection(req.user.roles, dashboard.roles).length) {
			return next();
		} else {
			return res.status(403).send({
				message: 'User is not authorized'
			});
		}
	});
};

/**
 * Require login routing middleware
 */
exports.requiresLogin = function(req, res, next) {
	if (!req.isAuthenticated()) {
		return res.status(401).send({
			message: 'User is not logged in'
		});
	}

	next();
};

/**
 * Map authorization middleware
 * Only allow users with role admin to this module
 */
exports.hasCreateAuthorization = function(req, res, next) {
	if (_.intersection(req.user.roles, ['admin']).length) {
				return next();
			} else {
				return res.send(403, {
					message: 'User is not authorized'
				});
			}
};