var app = angular.module('App', ['infinite-scroll']);

app.controller('IndexController', function($scope, $http) {
  $scope.sells = [];

  var offset = 0;

  $scope.load = function() {
    var params = {};

    params.offset = offset;

    if($scope.search) {
      params.search = $scope.search;
    }
    if($scope.onlyFree) {
      params.onlyFree = $scope.onlyFree;
    }
    if($scope.categoryId > 0) {
      params.categoryId = $scope.categoryId;
    }

    $http.get('api/index', {params: params})
    .success(function(data, status, headers, config) {
      data.sells.map(function(item) {
        $scope.sells.push(item);
      });

      offset = $scope.sells.length;
    })
    .error(function(data, status, headers, config) {
      alert('Error! ' + status + ' : ' + data)
    });
  };

  $scope.loadNew = function() {
    offset = 0;

    $scope.sells = [];

    $scope.load();
  }
});
