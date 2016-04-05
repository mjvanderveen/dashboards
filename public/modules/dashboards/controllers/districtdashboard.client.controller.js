'use strict';

<<<<<<< HEAD
angular.module('dashboards')
	.controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'CartoDB', 'GoogleSpreadsheet', '$window', '$stateParams', '$http', '$timeout', 'cfpLoadingBar',
	function($scope, $q, Authentication, Dashboards, CartoDB, GoogleSpreadsheet, $window, $stateParams, $http, $timeout, cfpLoadingBar) {
=======
angular.module('dashboards').controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'CartoDB', 'GoogleSpreadsheet', 'Dropbox', '$window', '$stateParams',
	function($scope, $q, Authentication, Dashboards, CartoDB, GoogleSpreadsheet, Dropbox, $window, $stateParams) {
>>>>>>> 0af5c793eaa83d76aaaa7ee353e857521e165307
		
		$scope.authentication = Authentication;
		$scope.dashboard = null;
		$scope.geom = null;

		$scope.config =  {
							whereFieldName:'districtcode',
							joinAttribute:'id',
							nameAttribute:'district',
							color:'#0080ff'
						};	
		
		/**
		 * Loading bar while waiting for data...
		 */
		$scope.start = function() {
		  cfpLoadingBar.start();
		};

		$scope.complete = function () {
		  cfpLoadingBar.complete();
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
		$scope.loadCartoDB = function(id){
			var d = $q.defer();
		    var result = CartoDB.get({table: id}, function() {
				d.resolve(result);
		    });
		    
			return d.promise;
		};
		
		$scope.loadGoogleSpreadsheet = function(sid){
			var d = $q.defer();
		    var result = GoogleSpreadsheet.query({id: sid}, function() {
				d.resolve(result);
		    });
		    
			return d.promise;
		};
		
		$scope.loadDropbox = function(f){
			var d = $q.defer();
		    var result = Dropbox.query({file: f}, function() {
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
			   $scope.loadCartoDB( 'Districts' ), // table with geo data that will be put on the choropleth map
			   $scope.loadCartoDB( 'Ready2Helpers' ),
			   $scope.loadGoogleSpreadsheet('RodeKruisAfdelingen'),
			   $scope.loadDropbox('ready2helpers.csv')
			   
			]).then(function(data) {
			   
			  var geom = data[0];
			  var d = [];
			  d.Ready2Helpers = data[1];
			  d.Districts = data[0];
			  
			  $scope.start();
			  
			  $scope.generateCharts(d);
			  
			  $scope.complete();
			   
			});
		};

		// fill the lookup table with the name attributes
		$scope.genLookup = function (){
			var lookup = {};
			$scope.geom.features.forEach(function(e){
				lookup[e.properties[$scope.config.joinAttribute]] = String(e.properties[$scope.config.nameAttribute]);
			});
			return lookup;
		};
			
		/**
		 * function to generate the 3W component
		 * data is loaded from the data set
		 * geom is geojson file
		 */
		$scope.generateCharts = function (data){
			
			var districtChart = dc.rowChart('#row-chart');
			var firstLetterChart = dc.pieChart('#fl-chart');
			var mapChart = dc.leafletChoroplethChart('#map-chart');
			
			// Set geom
			$scope.geom = data.Districts;	
			
			// simplify objects for easier access
			var d = [];
			d.Districts = data.Districts.features;
			d.Ready2Helpers = data.Ready2Helpers.rows;
			
			// get the lookup table
			var lookup = $scope.genLookup();
			
			/* create a crossfilter object from the data
			 * Data arrays are of same length
			 * tell crossfilter that  data is just a set of keys
			 * and then define your dimension and group functions to actually do the table lookup.
			 */
			var cf = crossfilter(d3.range(0, data.Districts.features.length));
		
			// The wheredimension returns the unique identifier of the geo area
			var whereDimension = cf.dimension(function(i) { return d.Districts[i].properties.id; });
			//var whereDimension2 = cf.dimension(function(i) { return d.Ready2Helpers[i].district; });
			var whereDimensionFL = cf.dimension(function(i) {
					return d.Districts[i].properties.district.substr(0,1);
				});
			
			
			//var whereGroupCount = whereDimension.group();
			var whereGroupSum = whereDimension.group().reduceSum(function(i) { return d.Ready2Helpers[i].number;});
			var whereGroupSumFL = whereDimensionFL.group().reduceSum(function(i) { return d.Ready2Helpers[i].number;});
			
			// Additional dimension return any value required
			//var ready2HelpersDimension = cf.dimension(function(i) {	return d.Ready2Helpers[i].number; });	
			
    		// create the groups
			//var ready2HelpersGroup = ready2HelpersDimension.group();
			//var whereGroup = whereDimension.group();
			//var whereGroup = whereDimension.group(function(i) {return d.Ready2Helpers[i].number;});
			//var whereGroupSum = ready2HelpersDimension.group().reduceSum(function(i) {return d.Ready2helpers[i].number;});
			
			//Edit Jannis
			//var districtDimension = cf.dimension(function(i) { return d.Ready2Helpers[i].district;});
			//var districtGroup = districtDimension.group().reduceSum(function(i) { return d.Ready2Helpers[i].number;});
			
			// group with all
			var all = cf.groupAll();

			// get the count of the number of rows in the dataset
			dc.dataCount('#count-info')
					.dimension(cf)
					.group(all);
					
			// create the mapchart
			$scope.mapChartOptions = {
				dimension: whereDimension,
				group: whereGroupSum,//Count,
				center: [0,0],
				zoom: 0,
				geojson: data.Districts, // this requires the full geojson object
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
				// this is the unique id of the geo area. Has to refer to the identifier in the whereDimension
				featureKeyAccessor: function(feature){
										return feature.properties.id;
									},
				popup: function(d){
							return lookup[d.key];
						},
				renderPopup: true
				
			};
				
			// create the data table
			dc.dataTable('#data-table')
						.dimension(whereDimension)                
						.group(function (i) {
							return ''; //ready2HelpersDimension[i];
						})
						.size(650)
						.columns([
							function(i){
							   return d.Districts[i].properties.district; 
							},
							function(i){
							   return d.Ready2Helpers[i].number;
							}
						])
						.order(d3.descending)
						.sortBy(function (i) {
							  return d.Ready2Helpers[i].number; //d.Districts[i].properties.district;
						});

		
			// we need this becuase we used d3 to load the data and we are outside the angular space
            //$scope.$apply();
			
			districtChart
				.width(600)
				.height(500)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(whereDimension)
				.group(whereGroupSum)
				.colors(d3.scale.ordinal().range(['#0080ff']))
				.ordering(function(d) { return -d.value; })
				.label(function (d) { return lookup[d.key]; })
				.title(function (d) { return d.value; })
				.renderLabel(true)
				//.labelOffsetX(10)
				.renderTitleLabel(true)
				.titleLabelOffsetX(-30)
				//.titleLabelOffsetX(function(d) {return d.value; })
				.elasticX(true)
				//.xAxis(xAxis) //.ticks(4)
				//.turnOnControls(true)
				;
			
			firstLetterChart
				.width(600)
				.height(300)
				.radius(100)
				.innerRadius(50)
				.dimension(whereDimensionFL)
				.group(whereGroupSumFL)
				.colors(d3.scale.linear().domain([0,5417]).range(['#CCCCCC', '#0080ff']))
				.colorAccessor(function(d) { return d.value; })
				.ordering(function(d) { return -d.value; })
				.legend(dc.legend().x(140).y(0).gap(5))
				//.label(function (d) { return d.key; })
				//.title(function (d) { return d.value; })
				//.renderLabel(true)
				//.labelOffsetX(10)
				//.renderTitleLabel(true)
				//.titleLabelOffsetX(-30)
				//.titleLabelOffsetX(function(d) {return d.value; })
				//.elasticX(true)
				//.xAxis(xAxis) //.ticks(4)
				//.turnOnControls(true)
				;
				
			mapChart
				.width($('#map-chart').width())
				.height(360)
				.dimension(whereDimension)
				.group(whereGroupSum)//Count)
				.center([0,0])
				.zoom(0)    
				.geojson(data.Districts) //geom)
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {
					if(d>0){
						return 1;
					} else {
						return 0;
					}
				})           
				.featureKeyAccessor(function(feature){
					return feature.properties.id;
				})
				.popup(function(d){
					return lookup[d.key];
				})
				.renderPopup(true)
				.turnOnControls(true)
				;
			
		
			dc.renderAll();
			
			var map = mapChart.map();
			
			function zoomToGeom(geom){
				var bounds = d3.geo.bounds(geom);
				map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
			}
			
			zoomToGeom($scope.geom);
					
			
			
			};
		
		
		
		/**
		 * Watch MapChart
		 
		$scope.$watch('mapChart', function() {
		//$scope.$watch('map-chart', function() {
                    if ($scope.mapChart) {
                        $scope.zoomToGeom($scope.mapChart.map());
                    }
                });

		*/
		/**
		 * Zoom to the extent of the data
		 
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
		*/	


		
	}
]);