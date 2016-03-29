'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    cartodb = require('../../app/controllers/cartodb'),
    apicache = require('apicache').options({ debug: true }).middleware;
    //Cacher = require("cacher");

//var cacher = new Cacher().cache('seconds', 60);

module.exports = function(app) {


	// Finish by binding the middleware
	//app.param('table', cartodb.getTable);

	// Cartodb Routes   
	app.route('/cartodb/:table').get(users.requiresLogin, apicache('5 minutes'), cartodb.getTable);
		
	
};