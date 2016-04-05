'use strict';

/**
 * Module dependencies.
 */

var GoogleSpreadsheet = require('google-spreadsheet'),
	secrets = require('../../config/secrets'),
    async = require('async'),
	_ = require('lodash');


/**
 * Get all rows from a table
 */
 
exports.getSheet = function(req, res, next){

    var id = req.params.id;
	var key = secrets.googlespreadsheets.sheets[id].key;
	var columns = secrets.googlespreadsheets.sheets[id].columns;
	
	// spreadsheet key is the long id in the sheets URL
	var doc = new GoogleSpreadsheet(key);
	var sheet;
	 
	async.series([
	  function setAuth(step) {
		// see notes below for authentication instructions!
		doc.useServiceAccountAuth(secrets.googlespreadsheets.auth, step);
	  },
	  function getInfoAndWorksheets(step) {
		doc.getInfo(function(err, info) {
		  console.log('Loaded doc: '+info.title+' by '+info.author.email);
		  sheet = info.worksheets[0];
		  console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
		  step();
		});
	  },
	  function workingWithRows(step) {
		// google provides some query options
		sheet.getRows({}, function( err, rows ){
			
			var data = [];

			if(rows.length === 0){
				return res.send(400, {
							message: 'no rows in sheet'
						});
			}

			if(columns.length === 0){
				return res.send(400, {
							message: 'no columns to be returned in filtered sheet'
						});
			}
			
			// filter rows
			for( var i in rows) {
			
				var d = {};
				for (var property in rows[i]) {

				  if (rows[i].hasOwnProperty(property)) {
					  if (columns.indexOf(property) >= 0) {
						d[property] = rows[i][property];
					  }
				  }
				  
				}

				data.push(d);
			}

			return res.jsonp(data);
		});
	  }
	 ]);
};
