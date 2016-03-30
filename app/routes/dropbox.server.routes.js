'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    dropbox = require('../../app/controllers/dropbox'),
	apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {
	// Routes   
	app.route('/dropbox/:file').get(users.requiresLogin, apicache('5 minutes'), dropbox.getFile);

};