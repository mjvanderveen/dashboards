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
	  
	  var fileUrl = config.sharepoint.sharePointSiteBaseUrl + '/lists/getbytitle(\'' + file + '\')';
	  
        var opts = {
            auth: { 'bearer' : secrets.sharepoint.access_token },
            headers : {
                'accept' : 'application/json;odata=verbose', 
                'content-type' : 'application/json;odata=verbose'
            },
            secureProtocol: 'TLSv1_method'  // required of Shareoint site and OneDrive,
        };
        
        require.get(fileUrl, opts, function (error, response, body) {
            if (error) {
                res.send(400, {
                            message: error
                   });
            }
            else if (response.statusCode > 299) {
				res.send(response.statusCode, {
                            message: body
                   });
            } else {
                var data = { result: !body ? body : JSON.parse(body) };
                var newListUri = data.result.d.__metadata.uri;
                res.render('site', { data: data });
            }
        });
};