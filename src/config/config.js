const app = window.app;

app.controller('DockerRunnerController', ($scope, $http) => {
  $http.get('../api/docker/containers', { params: { branch: $scope.branch.name } }).then((response) => {
    $scope.containers = response.data;
  });

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
});
