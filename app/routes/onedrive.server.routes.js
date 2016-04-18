'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    onedrive = require('../../app/controllers/onedrive'),
	apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {
	// Routes   
	app.route('/onedrive/:file').get(users.requiresLogin, apicache('5 minutes'), onedrive.getFile);

};