'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    GoogleSpreadsheet = require('../../app/controllers/google-spreadsheet');

module.exports = function(app) {
	// Routes   
	app.route('/googlespreadsheet/:id')
		.get(users.requiresTest, GoogleSpreadsheet.getSheet);
		
	// Finish by binding the article middleware
	app.param('id', GoogleSpreadsheet.getSheet);
};