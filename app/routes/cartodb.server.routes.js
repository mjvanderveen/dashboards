'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    cartodb = require('../../app/controllers/cartodb');

module.exports = function(app) {
	/*app.route('/cartodb/ready2helpers')
		.get(users.requiresLogin, cartodb.getReady2Helpers);
		
	app.route('/cartodb/districts')
		.get(users.requiresLogin, cartodb.getDistricts);	*/
	
	// Cartodb Routes   
	app.route('/cartodb/:table')
		.get(users.requiresLogin, cartodb.getTable);
		
	

	// Finish by binding the article middleware
	app.param('table', cartodb.getTable);
};