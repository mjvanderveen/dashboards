'use strict';

/**
 * Module dependencies.
 */

var CartoDB = require('cartodb'),
	secrets = require('../../config/secrets'),
	_ = require('lodash');


/**
 * Get all rows from a table
 */
 
exports.getTable = function(req, res, next, id){

	switch (id) {
	  case 'Ready2Helpers':
		return exports.getReady2Helpers(req, res, next, id);
	  case 'Districts':
		return exports.getDistricts(req, res, next, id);
	  default:
		return exports.getDistricts(req, res, next, id);
	}	
};

exports.getReady2Helpers = function(req, res, next, id){

	var sql = new CartoDB.SQL({user:secrets.cartodb.user, api_key:secrets.cartodb.api_key});

	sql.execute('SELECT districtcode as id, district, number FROM ready2helpers')
	  //you can listen for 'done' and 'error' promise events
	  .done(function(data) {
			res.jsonp(data);
	  })
	  .error(function(err) {
		  return res.send(400, {
                            message: err
                 });
	  });	
};

exports.getDistricts = function(req, res, next, id){

	var sql = new CartoDB.SQL({user:secrets.cartodb.user, api_key:secrets.cartodb.api_key});

	sql.execute('SELECT tdn_code as id, the_geom, naam as district FROM districten', {format: 'GeoJSON'})
	  //you can listen for 'done' and 'error' promise events
	  .done(function(data) {
			res.jsonp(data);
	  })
	  .error(function(err) {
		  return res.send(400, {
                            message: err
                 });
	  });	
};

exports.getMapUrl = function(req, res, next, mapConfig){
	$.ajax({
            crossOrigin: true,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            url: 'https://' + secrets.cartodb.user + '.cartodb.com/api/v1/map/named?api_key=' + secrets.cartodb.api_key,
            data: JSON.stringify(mapConfig),
            success: function(data) {
              var templateUrl = 'http://' + secrets.cartodb.user + '.cartodb.com/api/v1/map/named' + data.layergroupid + '{z}/{x}/{y}.png';
              return res.jsonp(templateUrl);
            }
        });			
	
};
