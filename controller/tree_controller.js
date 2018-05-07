require('./controller/script.js');
(function() {
  'use strict';
  angular
    .module('app.main')
    .controller('explorer', explorer);

/**
 * Controller to display projects and tasks in a tree like structure
 * @param {object} $scope Environment with methods and variables.
 * @param {object} $timeout Timeoutfunction from Angular.
 * @param {object} $document Is the document model from document object model.
 * @param {object} $controller
*/
  function explorer($scope, $timeout, $document, $controller) {
    $controller('mainApp', {$scope: $scope});
    /* eslint-disable-next-line */
    let vm = this;
    vm.findProjectsOrTasks = () => {
      db.find(findProjectsOrTasks())
        .then((doc) => {
                $scope.$apply(() => {
            $scope.tree = doc.docs;
          });
        });
    };

  /** Retrieves projects and tasks for the project tree and keeps it fresh. */
  vm.findProjectsOrTasks();

  db.changes({live: true, since: 'now', include_docs: true})
  .on('change', () => {
    vm.findProjectsOrTasks();
    $timeout(() => {
      $('#tree').treed();
    }, 300);
  });

    $document.ready(() => {
      $timeout(() => {
        $('#tree').treed();
      }, 300);
    });
  }
}());
