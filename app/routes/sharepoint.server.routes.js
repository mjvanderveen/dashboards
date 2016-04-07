'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    sharepoint = require('../../app/controllers/sharepoint'),
	apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {
	// Routes   
	app.route('/sharepoint/:file').get(users.requiresLogin, apicache('5 minutes'), sharepoint.getFile);

};