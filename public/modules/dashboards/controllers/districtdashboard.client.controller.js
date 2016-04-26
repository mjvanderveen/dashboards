'use strict';

angular.module('dashboards')
	.controller('DistrictDashboardsController', ['$scope', '$q', 'Authentication', 'Dashboards', 'Sources', '$window', '$stateParams', 'cfpLoadingBar',
	function($scope, $q, Authentication, Dashboards, Sources, $window, $stateParams, cfpLoadingBar) {

		$scope.authentication = Authentication;
		$scope.geom = null;
		//Specify which metric is filling the row-chart when opening the dashboard
		$scope.metric = 'R2HaantalActief';

		$scope.config =  {
							whereFieldName:'districtcode',
							joinAttribute:'tdn_code',
							nameAttribute:'naam',
							color:'#0080ff'
						};	
		
		//functions needed for loading bar while waiting for data
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
			
			// start loading bar
		    $scope.start();
		  
			Dashboards.get({dashboardId: $stateParams.dashboardId},
			    function(data) {		
					// get the data
					$scope.prepare(data);
			    },
			    function(error) {
					console.log(error);
				//$scope.addAlert('danger', error.data.message);
			    });
				
					
		};  
		
		/**
		 * get the data from the files as defined in the config.
		 * load  them with ajax and if both are finished, generate the charts
		 */
		$scope.prepare = function(dashboard) {
		  // set the title
		  $scope.title = $scope.config.title;
				
		  // create the map chart (NOTE: this has to be done before the ajax call)
		  $scope.mapChartType = 'leafletChoroplethChart';	
		  
		  // The resp returns the data in another array, so use index 0 		  
		  var d = {};
		  $scope.geom = dashboard.sources.DistrictsLocal.data;
		
		  d.Ready2Helpers = dashboard.sources.Ready2HelpCartoDB.data;
		  d.Districts = dashboard.sources.DistrictsLocal.data;
		  d.Rapportage = dashboard.sources.DistrictsRapportage.data;
			
		  $scope.generateCharts(d);
		  
		  // end loading bar
		  $scope.complete();	   

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
				
			//define dc-charts (the name-tag following the # is how you refer to these charts in html with id-tag)
			var districtChart = dc.rowChart('#row-chart');
			var mapChart = dc.leafletChoroplethChart('#map-chart');
					
			// get the lookup table
			var lookup = $scope.genLookup();
			
			/* create a crossfilter object from the data
			 * Data arrays are of same length
			 * tell crossfilter that  data is just a set of keys
			 * and then define your dimension and group functions to actually do the table lookup.
			 // Edit Jannis: I ended op including all the data in the crossfilter, because I ran into problems otherwise. 
			 // Edit Jannis: Maybe this make it a little bit slower, but not much
			 */
			 
			//var cf = crossfilter(d3.range(0, data.Districts.features.length));
			var cf = crossfilter(d.Rapportage);
		
			// The wheredimension returns the unique identifier of the geo area
			var whereDimension = cf.dimension(function(d) { return d.DistrictNummer; });
			// Create the same dimension again with another name for the row-chart, because two charts cannot have the same dimension
			var districtDimension = cf.dimension(function(d) { return d.DistrictNummer; });
			
			// Create the groups for these two dimensions (i.e. sum the metric)
			var whereGroupSum = whereDimension.group().reduceSum(function(d) { return d.R2HaantalActief;});
			var districtGroupSum = districtDimension.group().reduceSum(function(d) { return d.R2HaantalActief;});
			
			// Create customized reduce-functions to be able to calculated percentages over all or multiple districts (i.e. the % of male volunteers))
			var reduceAddAvg = function(metric) {
				return function(p,v) {
					p.sumOfSub += v[metric];
					p.sumOfTotal += v.TotaalaantalVW;
					p.finalVal = p.sumOfSub / p.sumOfTotal;
					return p;
				};
			};
			var reduceRemoveAvg = function(metric) {
				return function(p,v) {
					p.sumOfSub -= v[metric];
					p.sumOfTotal -= v.TotaalaantalVW;
					p.finalVal = p.sumOfSub / p.sumOfTotal;
					return p;
				};
			};
			var reduceInitialAvg = function() {
				return {sumOfSub:0, sumOfTotal:0, finalVal:0 };
			}; 
			
			
			//All data-tables are not split up in dimensions. The metric is always the sum of all selected records. Therefore we create one total-dimension
			var totaalDim = cf.dimension(function(i) { return 'Totaal'; });

			//For this total-dimension we create a group for each metric to calculate the sum
			//For the age-groups and sex-groups, we calculate the number of volunteers as a percentage of total volunteers (with the custom reduce functions)
			var TotaalaantalVWGroup = totaalDim.group().reduceSum(function(d) {return d.TotaalaantalVW;});
			var VWinstroomGroup = totaalDim.group().reduceSum(function(d) {return d.VWinstroom;});
			var VWuitstroomGroup = totaalDim.group().reduceSum(function(d) {return d.VWuitstroom;});
			var LeeftijdOnbekendGroup = totaalDim.group().reduceSum(function(d) {return d.LeeftijdOnbekend;});
			var LeeftijdOnder18Group = totaalDim.group().reduce(reduceAddAvg('LeeftijdOnder18'),reduceRemoveAvg('LeeftijdOnder18'),reduceInitialAvg);
			var Leeftijd18tot30Group = totaalDim.group().reduce(reduceAddAvg('Leeftijd18tot30'),reduceRemoveAvg('Leeftijd18tot30'),reduceInitialAvg);
			var Leeftijd30tot50Group = totaalDim.group().reduce(reduceAddAvg('Leeftijd30tot50'),reduceRemoveAvg('Leeftijd30tot50'),reduceInitialAvg);
			var Leeftijd50tot65Group = totaalDim.group().reduce(reduceAddAvg('Leeftijd50tot65'),reduceRemoveAvg('Leeftijd50tot65'),reduceInitialAvg);
			var Leeftijd65tot85Group = totaalDim.group().reduce(reduceAddAvg('Leeftijd65tot85'),reduceRemoveAvg('Leeftijd65tot85'),reduceInitialAvg);
			var LeeftijdOnder85Group = totaalDim.group().reduce(reduceAddAvg('LeeftijdOnder85'),reduceRemoveAvg('LeeftijdOnder85'),reduceInitialAvg);
			var GeslachtManGroup = totaalDim.group().reduce(reduceAddAvg('GeslachtMan'),reduceRemoveAvg('GeslachtMan'),reduceInitialAvg);
			var GeslachtVrouwGroup = totaalDim.group().reduce(reduceAddAvg('GeslachtVrouw'),reduceRemoveAvg('GeslachtVrouw'),reduceInitialAvg);
			var GeslachtOnbekendGroup = totaalDim.group().reduce(reduceAddAvg('GeslachtOnbekend'),reduceRemoveAvg('GeslachtOnbekend'),reduceInitialAvg);
			var ALGaantalinwonersGroup = totaalDim.group().reduceSum(function(d) {return d.ALGaantalinwoners;});
			var ALGaantalgemeentenGroup = totaalDim.group().reduceSum(function(d) {return d.ALGaantalgemeenten;});
			var R2HaantalActiefGroup = totaalDim.group().reduceSum(function(d) {return d.R2HaantalActief;});
			var ALGaantalbestuursledenGroup = totaalDim.group().reduceSum(function(d) {return d.ALGaantalbestuursleden;});
			var NHTotaalGroup = totaalDim.group().reduceSum(function(d) {return d.NHTotaal;});
			var NHBZOGroup = totaalDim.group().reduceSum(function(d) {return d.NHBZO;});
			var NHEVHGroup = totaalDim.group().reduceSum(function(d) {return d.NHEVH;});
			var NHNHTGroup = totaalDim.group().reduceSum(function(d) {return d.NHNHT;});
			var NHOverigGroup = totaalDim.group().reduceSum(function(d) {return d.NHOverig;});
			var NHOverlapGroup = totaalDim.group().reduceSum(function(d) {return d.NHOverlap;});
			var NHBestuurGroup = totaalDim.group().reduceSum(function(d) {return d.NHBestuur;});
			var NHCoordinatorGroup = totaalDim.group().reduceSum(function(d) {return d.NHCoordinator;});
			var COMTotaalGroup = totaalDim.group().reduceSum(function(d) {return d.COMTotaal;});
			var COMBestuurGroup = totaalDim.group().reduceSum(function(d) {return d.COMBestuur;});
			var COMCoordinatorGroup = totaalDim.group().reduceSum(function(d) {return d.COMCoordinator;});
			var FWTotaalGroup = totaalDim.group().reduceSum(function(d) {return d.FWTotaal;});
			var FWBestuurGroup = totaalDim.group().reduceSum(function(d) {return d.FWBestuur;});
			var FWCoordinatorGroup = totaalDim.group().reduceSum(function(d) {return d.FWCoordinator;});
			var RHTotaalGroup = totaalDim.group().reduceSum(function(d) {return d.RHTotaal;});
			var RHBestuurGroup = totaalDim.group().reduceSum(function(d) {return d.RHBestuur;});
			var RHCoordinatorGroup = totaalDim.group().reduceSum(function(d) {return d.RHCoordinator;});
			var ZELFTotaalGroup = totaalDim.group().reduceSum(function(d) {return d.ZELFTotaal;});
			var ZELFBestuurGroup = totaalDim.group().reduceSum(function(d) {return d.ZELFBestuur;});
			var ZELFCoordinatorGroup = totaalDim.group().reduceSum(function(d) {return d.ZELFCoordinator;});

			// group with all, needed for data-count
			var all = cf.groupAll();

			// get the count of the number of rows in the dataset (total and filtered)
			dc.dataCount('#count-info')
					.dimension(cf)
					.group(all);
			
			//Define number formats for absolute numbers and for percentage metrics
			var numberFormat = d3.format(',');
			var numberFormatPerc = d3.format(',.1%');
			
			//Create the map-chart
			mapChart
				.width($('#map-chart').width())
				.height(360)
				.dimension(whereDimension)
				.group(whereGroupSum)
				.center([0,0])
				.zoom(0)    
				.geojson(d.Districts) //geom)
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {if(d>0){return 1;} else {return 0;}})           
				.featureKeyAccessor(function(feature){
					return feature.properties.tdn_code;
				})
				.popup(function(d){
					return lookup[d.key];
				})
				.renderPopup(true)
				.turnOnControls(true)
				;
			
			//Create the row-chart 
			districtChart
				.width(350)
				.height(450)
				.margins({top: 0, left: 10, right: 50, bottom: 20})
				.dimension(districtDimension)
				.group(districtGroupSum)
				.colors(['#CCCCCC', $scope.config.color])
				.colorDomain([0, 1])
				.colorAccessor(function (d) {if(d.value > 0){return 1;} else {return 0;}})           
				.ordering(function(d) { return -d.value; })
				.label(function (d) { return lookup[d.key]; })
				.title(function (d) { return numberFormat(d.value); })
				.renderLabel(true)
				.renderTitleLabel(true)
				.titleLabelOffsetX(-50)
				.elasticX(true)
				.xAxis().ticks(4)
				;
			
			//Function that initiates ng-click event for changing the metric in the row-chart when clicking on a metric
			//It differentiates on type of metric (percentage or absolute count)
			$scope.go = function(id) {
			  $scope.metric = id;	
			  districtGroupSum.dispose();
			  if (id.indexOf('Leeftijd') >= 0 || id.indexOf('Geslacht') >= 0) {
			    districtGroupSum = districtDimension.group().reduce(reduceAddAvg(id),reduceRemoveAvg(id),reduceInitialAvg);
			    districtChart
					.group(districtGroupSum)
					.valueAccessor(function(d) {return d.value.finalVal;})
					.colorAccessor(function (d) {if(d.value.finalVal > 0){return 1;} else {return 0;}})            
					.ordering(function(d) { return -d.value.finalVal; })
					.title(function(d) {return numberFormatPerc(d.value.finalVal);});
			  } else {
			    districtGroupSum = districtDimension.group().reduceSum(function(d) { return d[id];});	
				districtChart
					.group(districtGroupSum)
					.valueAccessor(function(d) {return d.value;})
					.colorAccessor(function (d) {if(d.value > 0){return 1;} else {return 0;}})           
					.ordering(function(d) { return -d.value; })
					.title(function(d) {return numberFormat(d.value);});  
			  }
			  dc.filterAll();
			  dc.redrawAll();
			};
			
			//This is needed for changing the metric of the row-chart when using the carousel arrows
			//NOTE: this does not work yet at the moment
			$scope.go_left = function() {
				if ($('div.active').index() === 0) {$scope.go('ALGaantalinwoners');}
				else if ($('div.active').index() === 1) {$scope.go('R2HaantalActief');}
				else if ($('div.active').index() === 2) {$scope.go('NHTotaal');}
				else if ($('div.active').index() === 3) {$scope.go('FWTotaal');}
				else if ($('div.active').index() === 4) {$scope.go('RHTotaal');}
			};
			$scope.go_right = function() {
				if ($('div.active').index() === 3) {$scope.go('ALGaantalinwoners');}
				else if ($('div.active').index() === 4) {$scope.go('R2HaantalActief');}
				else if ($('div.active').index() === 0) {$scope.go('NHTotaal');}
				else if ($('div.active').index() === 1) {$scope.go('FWTotaal');}
				else if ($('div.active').index() === 2) {$scope.go('RHTotaal');}
			};
			
			// create the data tables: because metrics are in columns in the data set and not in rows, we need one data-table per metric
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
						.columns([function(d){return 'Mannen';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table8')
						.dimension(GeslachtVrouwGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Vrouwen';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table9')
						.dimension(LeeftijdOnder18Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: <18';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table10')
						.dimension(Leeftijd18tot30Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 18-30';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table11')
						.dimension(Leeftijd30tot50Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 30-50';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table12')
						.dimension(Leeftijd50tot65Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 50-65';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			dc.dataTable('#data-table13')
						.dimension(Leeftijd65tot85Group)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Leeftijd: 65-85';}, function(d){return numberFormatPerc(d.value.finalVal);}])
						.order(d3.descending)
						;
			
			// NOODHULP			
			dc.dataTable('#data-table14')
						.dimension(NHTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal vrijwilligers totaal';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;			
			dc.dataTable('#data-table15')
						.dimension(NHBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal bestuursleden';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;				
			dc.dataTable('#data-table16')
						.dimension(NHCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Aantal coördinatoren';}, function(d){return numberFormat(d.value);}])
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

			// FONDSENWERVING	
			dc.dataTable('#data-table22')
						.dimension(FWTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal vrijwilligers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table23')
						.dimension(FWBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal bestuur';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table24')
						.dimension(FWCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal coordinator';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
						
			//COMMUNICATIE
			dc.dataTable('#data-table25')
						.dimension(COMTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal vrijwilligers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table26')
						.dimension(COMBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal bestuur';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table27')
						.dimension(COMCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal coordinator';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;								

			// RESPECT & HULPBEREIDHEID	
			dc.dataTable('#data-table28')
						.dimension(RHTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal vrijwilligers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table29')
						.dimension(RHBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal bestuur';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table30')
						.dimension(RHCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal coordinator';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
						
			//ZELFREDZAAMHEID
			dc.dataTable('#data-table31')
						.dimension(ZELFTotaalGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal vrijwilligers';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table32')
						.dimension(ZELFBestuurGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal bestuur';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;	
			dc.dataTable('#data-table33')
						.dimension(ZELFCoordinatorGroup)                
						.group(function (i) {return ''; })
						.width(200)
						.columns([function(d){return 'Totaal coordinator';}, function(d){return numberFormat(d.value);}])
						.order(d3.descending)
						;							
						
			//Render all dc-charts and -tables
			dc.renderAll();
			
			//Extra code needed to initialize the map container
			//NOTE: this gives a 'Map container already initialized'-error when moving away from the districtdashboard and returning (via navigation)
			//NOTE: see https://github.com/mjvanderveen/dashboards/issues/1
			var map = mapChart.map();
			function zoomToGeom(geom){
				var bounds = d3.geo.bounds(geom);
				map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
			}
			zoomToGeom($scope.geom);
					
			
			
		};
	
	}
])

;
