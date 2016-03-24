'use strict';

//CartoDB service used for communicating with the articles REST endpoints
angular.module('dashboards')
/*.factory('Districts', ['$resource', function($resource) {
    return $resource('/cartodb/getDistricts', {}, {});
}])

.factory('Ready2Helpers', ['$resource', function($resource) {
    return $resource('/cartodb/getReady2Helpers', {}, {});
}])*/

.factory('CartoDB', ['$resource', function($resource) {
    return $resource('/cartodb/:table', {
        table: '@_id'
    }, {
        update: {
            method: 'PUT'
        }
    });
}]);