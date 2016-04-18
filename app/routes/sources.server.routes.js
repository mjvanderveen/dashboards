'use strict';

/**
 * Module dependencies.
 */

	
var _ = require('lodash');

var users = require('../../app/controllers/users'),	
    Sources = require('../../app/controllers/sources'),
	apicache = require('apicache').options({ debug: true }).middleware;

module.exports = function(app) {
	// Routes   
	app.route('/sources/:id').get(Sources.getSources);

};