'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    GoogleSpreadsheet = require('../../app/controllers/google-spreadsheet'),
	apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {
	// Routes   
	app.route('/googlespreadsheet/:id').get(users.requiresLogin, apicache('5 minutes'), GoogleSpreadsheet.getSheet);

};