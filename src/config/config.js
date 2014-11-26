const app = window.app;

app.controller('DockerRunnerController', ['$scope', function ($scope) {
  window.scoping = $scope;
  $scope.saving = false;

  $scope.$watch('runnerConfigs[branch.name][branch.runner.id]', function (value) {
    $scope.config = value;
  });

  $scope.save = function () {
    $scope.saving = true;
    $scope.runnerConfig($scope.config, function () {
      $scope.saving = false;
    });
  };
}]);
