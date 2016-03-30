'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    cartodb = require('../../app/controllers/cartodb'),
    apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {

	// Cartodb Routes   
	app.route('/cartodb/:table').get(users.requiresLogin, apicache('5 minutes'), cartodb.getTable);
		
	
};