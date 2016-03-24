'use strict';

angular.module('dashboards').controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'CartoDB', '$window', '$stateParams',
	function($scope, $q, Authentication, Dashboards, CartoDB, $window, $stateParams) {
		
		$scope.authentication = Authentication;
		$scope.dashboard = null;
		$scope.geom = null;

		$scope.config =  {
							title:'Vluchtelingenhulpverlening',
							description:'Wat doet het Rode Kruis voor de vluchtelingen in Nederland?',
							data:'modules/dashboards/data/data.json',
							refugeesHelpedFieldName:'RefugeesHelped',
							whereFieldName:'districtcode',
							geo:'modules/dashboards/data/districten.geojson',
							joinAttribute:'tdn_code',
							nameAttribute:'provnaam',
							color:'#03a9f4'
						};	
						
		/**
		 * Initiate the dashboard
		 */
		$scope.initiate = function() {	    
			
			Dashboards.get({dashboardId: $stateParams.dashboardId},
			    function(data) {
					// set data retrieved from the database
					$scope.dashboard = data;
				
					// set the title
					$scope.title = $scope.config.title;
					
					// get the data
					$scope.getData();
						
					// create the map chart (NOTE: this has to be done before the ajax call)
					$scope.mapChartType = 'leafletChoroplethChart';	
			    },
			    function(error) {
				//$scope.addAlert('danger', error.data.message);
			    });
				
					
		};  
		
		/**
		* load the data from cartodb
		*/ 
		$scope.loadGeoJson = function(id){
			var d = $q.defer();
		    var result = CartoDB.get({table: id}, function() {
				d.resolve(result);
		    });
		    
			return d.promise;
		};
		
		$scope.loadArray = function(id){
			var d = $q.defer();
		    var result = CartoDB.get({table: id}, function() {
				d.resolve(result);
		    });
		    
			return d.promise;
		};
		
		
		/**
		 * get the data from the files as defined in the config.
		 * load  them with ajax and if both are finished, generate the charts
		 */
		$scope.getData = function() {
			
			// Get data through $resource query to server, and only get data when all requests have resolved
			$q.all([
			   $scope.loadGeoJson( 'Districts' ), // table with geo data that will be put on the choropleth map
			   $scope.loadArray( 'Ready2Helpers' )
			   
			]).then(function(data) {
			   
			  var geom = data[0];
			  var d = [];
			  d.Ready2Helpers = data[1];
			  d.Districts = data[0];
			  
			  $scope.generateCharts(d);
			   
			});
			
			
			/*	
			$scope.dataCall = $.ajax({ 
				type: 'GET', 
				url: $scope.config.data, 
				dataType: 'json',
			});

			//load geometry

			$scope.geomCall = $.ajax({ 
				type: 'GET', 
				url: $scope.config.geo, 
				dataType: 'json',
			});

			//when both ready construct charts
			$.when($scope.dataCall, $scope.geomCall).then(function(dataArgs, geomArgs){
				
				var geom = geomArgs[0];
				geom.features.forEach(function(e){
					e.properties[$scope.config.joinAttribute] = String(e.properties[$scope.config.joinAttribute]); 
				});
					
				// generate the charts
				$scope.generateCharts(dataArgs[0],geom);
			});
			*/
		};

		// fill the lookup table with the name attributes
		$scope.genLookup = function (geojson,config){
			var lookup = {};
			geojson.features.forEach(function(e){
				lookup[e.properties[config.joinAttribute]] = String(e.properties[config.nameAttribute]);
			});
			return lookup;
		};
			
		/**
		 * function to generate the 3W component
		 * data is loaded from the data set
		 * geom is geojson file
		 */
		$scope.generateCharts = function (data){
			
			// get the lookup table
			//var lookup = $scope.genLookup(geom,$scope.config);
			
			/* create a crossfilter object from the data
			 * Data arrays are of same length
			 * tell crossfilter that  data is just a set of keys
			 * and then define your dimension and group functions to actually do the table lookup.
			 */
			
			var cf = crossfilter(d3.range(0, data.Districts.length));
		
			// create the dimensions
			var whereDimension = cf.dimension(function(i) { return data.Districts[i].districtcode; });
			var ready2HelpersDimension = cf.dimension(function(i) { return data.Ready2Helpers.number; });
			//var whereDimension = cf.dimension(function(d){ return d[$scope.config.whereFieldName]; });
			//var refugeesHelpedDimension = cf.dimension(function(d){ return d[$scope.config.refugeesHelpedFieldName]; });

    		// create the groups
			var ready2HelpersGroup = ready2HelpersDimension.group();
			var whereGroup = whereDimension.group();
			
			// group with all
			var all = cf.groupAll();

			// get the count of the number of rows in the dataset
			dc.dataCount('#count-info')
					.dimension(cf)
					.group(all);
					
			// create the mapchart
			$scope.mapChartOptions = {
				dimension: whereDimension,
				group: whereGroup,
				center: [0,0],
				zoom: 0,
				geojson: data.Districts,
				featureOptions: {
									'fillColor': 'white',
									'color': 'gray',
									'opacity':0.5,
									'fillOpacity': 0.5,
									'weight': 1
								},
				colors: ['#CCCCCC', $scope.config.color],
				colorDomain: [0, 1],
				colorAccessor: function (d) {
												if(d>0){
													return 1;
												} else {
													return 0;
												}
											},           
				featureKeyAccessor: function(feature){
										return feature.properties[$scope.config.joinAttribute];
									},
				popup: function(d){
							return '';
							//return lookup[d.key];
						},
				renderPopup: true
				
			};
				
			// create the data table
			dc.dataTable('#data-table')
						.dimension(whereDimension)                
						.group(function (d) {
							return d[ready2HelpersDimension];
						})
						.size(650)
						.columns([
							function(d){
							   return d.district; 
							},
							function(d){
							   return d.number; 
							}
						]);  

			
			// we need this becuase we used d3 to load the data and we are outside the angular space
            //$scope.$apply();

			// Set geom
			$scope.geom = data.Districts;	
		};
		
		/**
		 * Watch MapChart
		 */
		$scope.$watch('mapChart', function() {
                    if ($scope.mapChart) {
                        $scope.zoomToGeom($scope.mapChart.map());
                    }
                });

		
		/**
		 * Zoom to the extend of the data
		 */
		$scope.zoomToGeom = function (map){
			
			if($scope.geom === null){
				return;
			}
			
			// get bounds from the geom
			var b = d3.geo.bounds($scope.geom);
			
			// add bounds to array
			var bounds = [
							[b[0][1], b[0][0]],
							[b[1][1], b[1][0]]
						 ];
			
			map.fitBounds(bounds);			

		};
			


		
	}
]);