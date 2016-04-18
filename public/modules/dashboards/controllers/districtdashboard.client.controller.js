'use strict';

angular.module('dashboards')
	.controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'Sources', '$window', '$stateParams', 'cfpLoadingBar',
	function($scope, $q, Authentication, Dashboards, Sources, $window, $stateParams, cfpLoadingBar) {

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
					$scope.getData($stateParams.dashboardId);
						
					// create the map chart (NOTE: this has to be done before the ajax call)
					$scope.mapChartType = 'leafletChoroplethChart';	
			    },
			    function(error) {
				//$scope.addAlert('danger', error.data.message);
			    });
				
					
		};  
			
		$scope.loadSources = function(sid){
			var d = $q.defer();
		    var result = Sources.get({id: sid}, function() {
				d.resolve(result);
		    });
		    
			return d.promise;
		};
		
		/**
		 * get the data from the files as defined in the config.
		 * load  them with ajax and if both are finished, generate the charts
		 */
		$scope.getData = function(dashboardId) {
			
			// start loading bar
			 $scope.start();
			  
			// Get data through $resource query to server, and only get data when all requests have resolved
			$q.all([
			   $scope.loadSources(dashboardId)
			]).then(function(dt) {
			  
			  // The resp returns the data in another array, so use index 0
			  var data = dt[0];	   		  
			  var d = {};
			  $scope.geom = data.DistrictsLocal.data;
			
			  d.Ready2Helpers = data.Ready2HelpCartoDB.data;
			  d.Districts = data.DistrictsLocal.data;
			  d.Rapportage = data.DistrictsRapportage.data;
			    
			  $scope.generateCharts(d);
			  
			  // end loading bar
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
		$scope.generateCharts = function (d){
				
			var districtChart = dc.rowChart('#row-chart');
			var districtChart2 = dc.rowChart('#row-chart2');
			//var compositeChart = dc.compositeChart('#composite-chart');
			var mapChart = dc.leafletChoroplethChart('#map-chart');
						
			// get the lookup table
			var lookup = $scope.genLookup();
			
			/* create a crossfilter object from the data
			 * Data arrays are of same length
			 * tell crossfilter that  data is just a set of keys
			 * and then define your dimension and group functions to actually do the table lookup.
			 */

			//var cf = crossfilter(d3.range(0, data.Districts.features.length));
			var cf = crossfilter(d3.range(0, d.Rapportage.length));
		
			// The wheredimension returns the unique identifier of the geo area
			var whereDimension = cf.dimension(function(i) { return d.Rapportage[i].DistrictNummer; });
			var districtDimension = cf.dimension(function(i) { return d.Rapportage[i].DistrictNummer; });
			var testDimension = cf.dimension(function(i) { return d.Rapportage[i].COMBestuur; });
			
			//var whereDimensionFL = cf.dimension(function(i) {
			//		return d.Districts[i].properties.district.substr(0,1);
			//	});
			
					
			var whereGroupSum = whereDimension.group().reduceSum(function(i) { return d.Rapportage[i].R2HaantalActief;});
			var districtGroupSum = districtDimension.group().reduceSum(function(i) { return d.Rapportage[i].R2HaantalActief;});
			var districtGroupSum2 = districtDimension.group().reduceSum(function(i) { return d.Rapportage[i].ALGaantalinwoners;});
			//var districtGroup = districtDimension.group().reduce(function(i) { return reduceFieldsAdd(d.Rapportage[i].fields), reduceFieldsRemove(d.Rapportage[i].fields), reduceFieldsInitial(d.Rapportage[i].fields));
			var testGroupCount = testDimension.group();
			//var whereGroupSumFL = whereDimensionFL.group().reduceSum(function(i) { return d.Rapportage[i].R2HaantalActief;});
			
			//Create all data for data-tables
			var totaalDim = cf.dimension(function(i) { return 'Totaal'; });

			var TotaalaantalVWGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].TotaalaantalVW;});
			var VWinstroomGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].VWinstroom;});
			var VWuitstroomGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].VWuitstroom;});
			var LeeftijdOnbekendGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].LeeftijdOnbekend;});
			var LeeftijdOnder18Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].LeeftijdOnder18;});
			// var LeeftijdOnder18Group = totaalDim.group().reduce(
														// function reduceAdd(p, v) {
															// p.sumOfSub += v.Rapportage[i].LeeftijdOnder18;
															// console.log(p.sumOfSub);
															// p.sumOfTotal += v.TotaalaantalVW;
															// p.finalVal = p.sumOfSub / p.sumOfTotal;
															// return p;
														// },
														// function reduceRemove(p, v) {
															// p.sumOfSub -= v.LeeftijdOnder18;
															// p.sumOfTotal -= v.TotaalaantalVW;
															// p.finalVal = p.sumOfSub / p.sumOfTotal;
															// return p;
														// },
														// function reduceInitial() {
															// return { sumOfSub:0, sumOfTotal:0, finalVal:0 };
													   // });
			var Leeftijd18tot30Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].Leeftijd18tot30;});
			var Leeftijd30tot50Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].Leeftijd30tot50;});
			var Leeftijd50tot65Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].Leeftijd50tot65;});
			var Leeftijd65tot85Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].Leeftijd65tot85;});
			var LeeftijdOnder85Group = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].LeeftijdOnder85;});
			var GeslachtManGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].GeslachtMan;});
			var GeslachtVrouwGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].GeslachtVrouw;});
			var GeslachtOnbekendGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].GeslachtOnbekend;});
			var ALGaantalinwonersGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ALGaantalinwoners;});
			var ALGaantalgemeentenGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ALGaantalgemeenten;});
			var R2HaantalActiefGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].R2HaantalActief;});
			var ALGaantalbestuursledenGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ALGaantalbestuursleden;});
			var NHTotaalGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHTotaal;});
			var NHBZOGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHBZO;});
			var NHEVHGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHEVH;});
			var NHNHTGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHNHT;});
			var NHOverigGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHOverig;});
			var NHOverlapGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHOverlap;});
			var NHBestuurGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHBestuur;});
			var NHCoordinatorGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].NHCoordinator;});
			var COMTotaalGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].COMTotaal;});
			var COMBestuurGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].COMBestuur;});
			var COMCoordinatorGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].COMCoordinator;});
			var FWTotaalGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].FWTotaal;});
			var FWBestuurGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].FWBestuur;});
			var FWCoordinatorGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].FWCoordinator;});
			var RHTotaalGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].RHTotaal;});
			var RHBestuurGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].RHBestuur;});
			var RHCoordinatorGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].RHCoordinator;});
			var ZELFTotaalGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ZELFTotaal;});
			var ZELFBestuurGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ZELFBestuur;});
			var ZELFCoordinatorGroup = totaalDim.group().reduceSum(function(i) {return d.Rapportage[i].ZELFCoordinator;});



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
				geojson: d.Districts, // this requires the full geojson object
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
			
			var numberFormat = d3.format(',');
				
			// create the data tables
			// ALGEMEEN
			dc.dataTable('#data-table2')
						.dimension(ALGaantalinwonersGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal inwoners';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table3')
						.dimension(ALGaantalgemeentenGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal gemeenten';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			
			// VRIJWILLIGERSMANAGEMENT			
			dc.dataTable('#data-table4')
						.dimension(TotaalaantalVWGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table5')
						.dimension(R2HaantalActiefGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal Ready2Helpers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table6')
						.dimension(ALGaantalbestuursledenGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal bestuursleden';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table7')
						.dimension(GeslachtManGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Mannen';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table8')
						.dimension(GeslachtVrouwGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Vrouwen';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table9')
						.dimension(LeeftijdOnder18Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: <18';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table10')
						.dimension(Leeftijd18tot30Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 18-30';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table11')
						.dimension(Leeftijd30tot50Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 30-50';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table12')
						.dimension(Leeftijd50tot65Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 50-65';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table13')
						.dimension(Leeftijd65tot85Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 65-85';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;
			
			// NOODHULP			
			dc.dataTable('#data-table14')
						.dimension(NHBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal bestuursleden';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;			
			dc.dataTable('#data-table15')
						.dimension(NHCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal coördinatoren';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table16')
						.dimension(NHTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers totaal';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table17')
						.dimension(NHBZOGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers BZO';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table18')
						.dimension(NHEVHGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers EVH';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table19')
						.dimension(NHNHTGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers NHT';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table20')
						.dimension(NHOverigGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers Overig';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table21')
						.dimension(NHOverlapGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal overlap';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
						
						
			// create the data table
			dc.dataTable('#data-table')
						.dimension(whereDimension)                
						.group(function (i) {
							return ''; 
						})
						.size(650)
						.columns([
							function(i){
							   return lookup[d.Rapportage[i].DistrictNummer]; 
							},
							function(i){
							   return d.Rapportage[i].R2HaantalActief;
							}
						])
						.order(d3.descending)
						.sortBy(function (i) {
							  return d.Rapportage[i].R2HaantalActief; //d.Districts[i].properties.district;
						});

		
			// we need this becuase we used d3 to load the data and we are outside the angular space
            //$scope.$apply();
			/*
			dc.compositeChart('#composite-chart')
				.width(600)
				.height(500)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(districtDimension)
				.compose([
					dc.rowChart('#chart')
						.group(districtGroupSum)
						.colors(['#CCCCCC', $scope.config.color])
						.colorDomain([0, 1])
						.colorAccessor(function (d) {
							if(d.value > 0){
								return 1;
							} else {
								return 0;
							}
						})           
						.ordering(function(d) { return -d.value; })
						.label(function (d) { return lookup[d.key]; })
						.title(function (d) { return numberFormat(d.value); })
					,dc.rowChart('#chart')
						.group(districtGroupSum2)
						.colors(['#CCCCCC', $scope.config.color])
						.colorDomain([0, 1])
						.colorAccessor(function (d) {
							if(d.value > 0){
								return 1;
							} else {
								return 0;
							}
						})           
						.ordering(function(d) { return -d.value; })
						.label(function (d) { return lookup[d.key]; })
						.title(function (d) { return numberFormat(d.value); })
				])
				//.group(districtGroupSum)
				//.stack(districtGroupSum2)
				//.renderLabel(true)
				//.renderTitleLabel(true)
				//.titleLabelOffsetX(-30)
				//.elasticX(true)
				//.xAxis().ticks(4)
				;
			*/	
			districtChart
				.width(300)
				.height(500)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(districtDimension)
				.group(districtGroupSum)
				//.stack(districtGroupSum2)
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {
					if(d.value > 0){
						return 1;
					} else {
						return 0;
					}
				})           
				.ordering(function(d) { return -d.value; })
				.label(function (d) { return lookup[d.key]; })
				.title(function (d) { return numberFormat(d.value); })
				.renderLabel(true)
				.renderTitleLabel(true)
				.titleLabelOffsetX(-30)
				.elasticX(true)
				.xAxis().ticks(4)
				;
				
			districtChart2
				.width(300)
				.height(500)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(districtDimension)
				.group(districtGroupSum2)
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {
					if(d.value > 0){
						return 1;
					} else {
						return 0;
					}
				})           
				.ordering(function(d) { return -d.value; })
				.label(function (d) { return lookup[d.key]; })
				.title(function (d) { return numberFormat(d.value); })
				//.renderLabel(true)
				.renderTitleLabel(true)
				.titleLabelOffsetX(-50)
				.elasticX(true)
				.xAxis().ticks(4)
				;
			/*	
			districtChart
				.width(600)
				.height(500)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(testDimension)
				.group(testGroupCount)
				//.data(function(group) { return group.top(15);})
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {
					if(d.value > 0){
						return 1;
					} else {
						return 0;
					}
				})           
				//.colors(d3.scale.ordinal().range(['#0080ff']))
				.ordering(function(d) { return -d.value; })
				.label(function (d) { return d.key ; })
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
			*/
			/*
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
			*/	
			mapChart
				.width($('#map-chart').width())
				.height(360)
				.dimension(whereDimension)
				.group(whereGroupSum)//Count)
				.center([0,0])
				.zoom(0)    
				.geojson(d.Districts) //geom)
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