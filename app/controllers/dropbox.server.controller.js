'use strict';

/**
 * Module dependencies.
 */

var Dropbox = require('dropbox'),
	secrets = require('../../config/secrets'),
	_ = require('lodash'),
	Converter = require('csvtojson').Converter;

    var dbClient = new Dropbox.Client(secrets.dropbox);
	
/**
 * Get file from dropbox
 */
 

exports.getFile = function(req, res, next){
	  var file = req.params.file;
	  
	  dbClient.authenticate(function(error, client) {
		  if (error) {
			return res.send(error.status, {
                            message: error.responseText.error
                   });
		  }
		 
		 client.readFile(file, function(error, data) {
			if (error) {
			  return res.send(error.status, {
						message: error.responseText.error
			  });
			}
		
			var converter = new Converter({delimiter: ',', eol: '\n'});
			
			converter.fromString(data, function(err,result){
			  res.jsonp(result);
			});
			  
		  });
	  });	
};