'use strict';
/**
 * Module dependencies.
 */

var GoogleSpreadsheet = require('google-spreadsheet'),
	Dropbox = require('dropbox'),
	secrets = require('../../config/secrets'),
	dashboards = require('../../app/controllers/dashboards'),
    async = require('async'),
	mongoose = require('mongoose'),
	Dashboard = mongoose.model('Dashboard'),
	CartoDB = require('cartodb'),
	Converter = require('csvtojson').Converter,
	secrets = require('../../config/secrets'),
	dbClient = new Dropbox.Client(secrets.dropbox),
	fs = require('fs'),
	request =   require('request'),
	_ = require('lodash');
	
	// set vars
    var local_result = [];

exports.getSources = function(req, res, next){
	// get dashboard id from request parameters
	var dashboardId = req.params.id;
	var dashboard;
	
	/**
	 * Call a number of asynchronous events in series
	 * cb is the callback function
	 */
	async.series([
	   function getDashboard(cb) {
		   // convert request id to mongoose objectid
			var _id = mongoose.Types.ObjectId(dashboardId);
			
			// If user is not logged in, add criteria for selecting public dashboards only
			var criteria = {'_id': _id};
			
			//Use lean to return just the javascript object and not the full the model instance
			Dashboard.findOne(criteria).lean().populate('user', 'displayName').exec(function(err, d) {
				if (err) return next(new Error(err));
				if (!d) return 'Failed to load dashboard: ' + dashboardId;
				dashboard = d;
				
				cb();
			});
	   },
	   // The authorization is handled in the dashboard controller. However, this additional check on the sources is in place for security
	   function hasAuthorization(cb){
		   // check if user is logged in for non public dashboards
			if(!dashboard.isPublic){
				if (!req.isAuthenticated()) {
					return res.status(401).send({
						message: 'User is not logged in'
					});
				} else  if (_.intersection(req.user.roles, dashboard.roles).length) {
					return res.status(403).send({
						message: 'User is not authorized'
					});
				}
			}
			
			cb();
	   },
	   // per souce use a different function to get the data
	   function getAllSources(cb) {
			var tasks = [];

			// So first loop through the array so that I can create
			// a task/function to handle each object in the array
			dashboard.DropboxSources.forEach(function(source, index) {
			(function(source) {
				  if(source.isActive){
						tasks.push(exports.getDropbox(source));
				  }				  
				})(source);
			});
			
			dashboard.GoogleSpreadsheetSources.forEach(function(source, index) {
			(function(source) {
				  if(source.isActive){
						tasks.push(exports.getGoogleSpreadSheet(source));
				  }				  
				})(source);
			});
			
			dashboard.FileLocalSources.forEach(function(source, index) {
			(function(source) {
				  if(source.isActive){
						tasks.push(exports.getFileLocal(source));
				  }				  
				})(source);
			});
			
			dashboard.FileUrlSources.forEach(function(source, index) {
			(function(source) {
				  if(source.isActive){
						tasks.push(exports.getFileUrl(source));
				  }				  
				})(source);
			});
			
			dashboard.CartoDBSources.forEach(function(source, index) {
			(function(source) {
				  if(source.isActive){
						tasks.push(exports.getCartoDB(source));
				  }				  
				})(source);
			});
			
			// perform all tasks in parallel
			async.parallel(tasks, function(err, sourceArr) {
				if(err) return next(err);
				
				// simplify sources to send back to client
				var result = {};
				sourceArr.forEach(function(source){
					result[source.sourceId] = {name: source.name, data: source.data, public: source.isPublic};
				});
				return res.jsonp(result);
			});
	   }
	]);
	
	
};

/**	
 * Get all rows from a google spreadsheet
 */
 exports.getGoogleSpreadSheet = function(source){
	
	return function(cb){
		// spreadsheet key is the long id in the sheets URL
		var doc = new GoogleSpreadsheet(source.key);
		var sheet;
		 
		async.series([
		  function setAuth(step) {
			// see notes below for authentication instructions!
			doc.useServiceAccountAuth(secrets.googlespreadsheets.auth, step);
			// check if auth was successfull
			/*if(!doc.isAuthActive()){
				source.error = 'Google Spreadsheet auth failed';
				return cb(true,source);
			}	*/
		  },
		  function getInfoAndWorksheets(step) {
			doc.getInfo(function(err, info) {
			  if(err) step(err);
			  sheet = info.worksheets[0];
			  step();
			});
		  },
		  function workingWithRows(step) {
			
			// google provides some query options
			sheet.getRows({}, function( err, rows ){
				if(err) step(err);
				
				var data = [];

				if(rows.length === 0){
					source.error = 'no rows in sheet';
					//console.log(source.error);
					return step(new Error(source.error));
				}

				if(source.columns.length === 0){
					source.error = 'no columns to be returned in filtered sheet';
					console.log(source.error);
					return step(new Error(source.error));
				}
				
				// filter rows
				for( var i in rows) {
				
					var d = {};
					for (var property in rows[i]) {

					  if (rows[i].hasOwnProperty(property)) {
						  if (source.columns.indexOf(property) >= 0) {
							d[property] = rows[i][property];
						  }
					  }
					  
					}

					data.push(d);
				}
				source.data = data;
				step();
			});
		  }
		 ], function(err, results) { //This function gets called after the two tasks have called their "task callbacks"
				if (err) return cb(err);
				return cb(null, source);
		});
	};
};

/*
 * Get file from dropbox
 */
exports.getDropbox = function(source){
	  
	  return function(cb){
		  dbClient.authenticate(function(error, client) {
			  if (error) {
				return cb(new Error(error));
			  }
			 
			 client.readFile(source.file, function(error, data) {
				if (error) {
					return cb(new Error(error));
				}
			
				var converter = new Converter({delimiter: ',', eol: '\n'});
				converter.fromString(data, function(err,result){
					if (err){
						return cb(new Error(err));
					}
					else {
						source.data = result;
						return cb(null, source);
					}
				});
			  });
		  });	
	  };
};

/*
 * get table from cartodb through query
 * return in geojson format for tables that contain geodata
 */
exports.getCartoDB = function(source){
	return function(cb){
		try {
			// Set the format to return the data in
			var format = {};
			if(source.format === 'GeoJSON'){
				format = {format: 'GeoJSON'};
			}
			
			var sql = new CartoDB.SQL({user:secrets.cartodb.user, api_key:secrets.cartodb.api_key});
			sql.execute(source.query, format)
			  //you can listen for 'done' and 'error' promise events
			  .done(function(data) {
					if(source.format === 'GeoJSON'){
						source.data = data;
					}
					else {
						source.data = data.rows;
					}
					
					return cb(null, source);
			  })
			  .error(function(error) {
				  console.log(error);
				  return cb(new Error(error));
			  });	

		} catch (ex) {
			return cb(new Error('query failed, no connection?'));
		}
		
	};
};

/*
 * get local file from drive.
 * use either data/private or data/public as path to the file
 */
exports.getFileLocal = function(source){
	  
	  return function(cb){
		    var obj;
			fs.readFile(source.file, 'utf8', function (err, data) {
			  if (err) {
				  return cb(new Error(err));
			  }
			  source.data = JSON.parse(data);
			  return cb(null, source);
			});
	  };
};

/*
 * Get file from url
 * Supports csv or geojson
 */
exports.getFileUrl = function(source){
	  
	  return function(cb){
		    var json = false;
			if(source.format === 'GeoJSON'){
				json = true;
			}
		    request({
				url: source.url,
				json: json
			}, function (err, response, body) {
				if (err) {
				  return cb(new Error(err));
			    }
				
				if (!err && response.statusCode === 200) {
					if(source.format === 'GeoJSON'){
						source.data = body;
						return cb(null, source);
					} else {
						
						var converter = new Converter({delimiter: ',', eol: '\n'});
						converter.fromString(body, function(err,result){
							if (err){
								return cb(new Error(err));
							}
							else {
								source.data = result;
								return cb(null, source);
							}
						});
					}
				}
			});
	  };
};