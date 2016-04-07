'use strict';

/**
 * Module dependencies.
 */

var Dropbox = require('dropbox'),
	secrets = require('../../config/secrets'),
	config = require('../../config/config'),
	_ = require('lodash'),
	Converter = require('csvtojson').Converter,
	request = require('request');
	
/**
 * Get file from dropbox
 */
 

exports.getFile = function(req, res, next){
	  var file = req.params.file;
	  
	  var fileUrl = config.onedrive.oneDriveBusinessBaseUrl + '/drive';
	  
	  var opts = {
            auth: { 'bearer' : secrets.onedrive.access_token },
            secureProtocol: 'TLSv1_method'  // required of Shareoint site and OneDrive
        };
	  
	  request.get(fileUrl, opts, function (error, response, body) {
            if (error) {
                return res.send(400, {
                            message: error
                   });
            }
            else if (response.statusCode !== 200) {
                return res.send(response.statuscode, {
                            message: body
                   });
            } else {
                var data = { result: JSON.parse(body) };
                res.render('file', { data: data });
            }
        });
};