'use strict';

angular.module('dashboards').controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'CartoDB', '$window', '$stateParams',
	function($scope, $q, Authentication, Dashboards, CartoDB, $window, $stateParams) {
		
		$scope.authentication = Authentication;
		$scope.dashboard = null;
		$scope.geom = null;

		$scope.config =  {
							whereFieldName:'districtcode',
							joinAttribute:'id',
							nameAttribute:'district',
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
		$scope.loadCartoDB = function(id){
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
			   $scope.loadCartoDB( 'Districts' ), // table with geo data that will be put on the choropleth map
			   $scope.loadCartoDB( 'Ready2Helpers' )
			   
			]).then(function(data) {
			   
			  var geom = data[0];
			  var d = [];
			  d.Ready2Helpers = data[1];
			  d.Districts = data[0];
			  
			  $scope.generateCharts(d);
			   
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
			
			// Additional dimension return any value required
			var ready2HelpersDimension = cf.dimension(function(i) {	return d.Ready2Helpers[i].number; });	

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
						.sortBy(function (i) {
							  return d.Districts[i].properties.district;
						});

			
			// we need this becuase we used d3 to load the data and we are outside the angular space
            //$scope.$apply();

			dc.renderAll();
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