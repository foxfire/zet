require('./controller/script.js');
(function() {
  'use strict';
  /* the application code is shared by the
  mainwindow and the stoppwatch-window */
  angular
    .module('app.main', ['angular-content-editable'])
    .config(function(contentEditableProvider) {
      contentEditableProvider.configure({
        singleLine: true, // single line for all elements
        focusSelect: false,
      });
    })
    .controller('mainApp', mainApp);

  mainApp.$inject = ['timeFactory', '$scope', '$timeout',
  '$filter', '$interval', '$document'];

  /**
   * @param {component} timeFactory component with "time to date"-converter
   * @param {object} $scope local refactoring
   * @param {function} $timeout
   * @param {function} $filter
   * @param {function} $interval
   * @param {function} $document
   */
  function mainApp(
    timeFactory, $scope, $timeout, $filter, $interval, $document) {
    /* eslint-disable-next-line */
    let vm = this;

    $scope.start = {
      value: new Date(moment().format('YYYY-MM-DD')),
    };

    $scope.end = {
      value: new Date(moment().format('YYYY-MM-DD')),
    };

    $scope.createStart = {
      value: new Date(moment().format('YYYY-MM-DDThh:mm')),
    };

    $scope.createEnd = {
      value: new Date(moment().format('YYYY-MM-DDThh:mm')),
    };

    /** Assures that Angular gets valid date-objects for date input fields */
    vm.isBig = false;

    /** Find all Projects */
    vm.findProjcts = () => {
      db.find(findProjects())
        .then((doc) => {
          $scope.$apply(() => {
            $scope.projects = doc.docs;
          });
        });
    };

    /* Find all expenditures from today. */
    vm.findAufwand = () => {
      $document.ready(() => {
        db.find(aufwandQuery())
          .then((doc) => {
            timeFactory.convert(doc.docs).then((docs) => {
              $scope.$apply(() => {
                $scope.items = docs;
                vm.findTaskProjectSW(docs);
              });
            });
          });
      });
    };

    /**
    * Updates normally affect the whole UI. This function only updates
    locally for frequently changing stuff like stopwatch-timer.
    * @param {object} orig original object that needs to be compared
    * @param {object} current changed object from scope.
    */
    vm.getUpdateObject = (orig, current) => {
      /** list for properties where UI should not be redrawn */
      let notUpdate = ['time', '_rev', 'lend2'];
      let switch1 = true;
      /**
       * for loop iterates faster than data can be provided through the arrays
       */
      async function iterate() {
        for (let prop in orig) {
          if (orig) {
            let f1 = await orig[prop].toString().trim();
            let f2 = await current[prop].toString().trim();

            if (await f1 !== f2 || await prop === 'time') {
              orig[prop] = await current[prop];

              if (notUpdate.indexOf(prop) === -1) {
                switch1 = false;
                break;
              }
            }
          }
        }
      }
      iterate();
      if (switch1) {
        $scope.$digest();
      } else {
        vm.findAufwand();
      }
    };
    /**
     * Checks for changes in scope and only updates
     * the specific part of the ui that has changed.
     * */

    vm.updateScopeVars = (change) => {
      /* eslint-disable-next-line */
      let id = $scope.items.findIndex(arr => arr._id == change.doc._id);
      if (id !== -1 && !change.deleted) {
        vm.getUpdateObject($scope.items[id], change.doc);
      } else {
        vm.findAufwand();
      }
    };

    /* Find all tasks in project */
    vm.findTaskProject = () => {
      db.find(findTasksFromProject())
        .then((doc) => {
          $scope.$apply(() => {
            $scope.tasks = doc.docs;
          });
        });
    };

    /* Find task in project for item creation */
    vm.findTaskProjectModal = (project) => {
      db.find(findModalTasksFromProject(project))
        .then((doc) => {
          $scope.$apply(() => {
            $scope.mtasks = doc.docs;
          });
        });
    };

    /* Find Tasks on selection */
    vm.findTaskOnSelect = (project, i) => {
      db.find(findModalTasksFromProject(project, i))
        .then((doc) => {
          $scope.$apply(() => {
            $scope.mtasks[i] = doc.docs;
          });
        });
    };

    // Find Task in Projekts for Stoppwatch
    vm.findTaskProjectSW = (items) => {
      let collection = [];
      let finishedCollection = [];
      for (let i = 0; i < items.length; i++) {
        collection.push(
          db.find(findModalTasksFromProject(items[i].project))
            .then((doc) => {
              return doc.docs;
            })
        );
        if (i === items.length - 1) {
          finishedCollection = collection;

          Promise.all(finishedCollection)
            .then((dataAll) => {
              $scope.$apply(() => {
                $scope.mtasks = dataAll;
              });
            });
        }
      }
    };

    /* Changes dynamically the array that should
    be displayed in stopwatches task ng-repeater. */
    vm.getFeeder = (i) => {
      if (typeof $scope.mtasks !== 'undefined') {
        return $scope.mtasks[i];
      }
    };

    /* Initial calls to launch the UI. You can find the
    queries for pouchDB in queries.js
    Find all expenditures from today. */
    vm.findAufwand();

    /* Find all projects. */
    vm.findProjcts();


    /* Find all tasks from project */
    $scope.filterAufwand = () => {
      vm.findTaskProject();
      vm.findAufwand();
    };

    /* Updates view when data changes in db. */
    db.changes({live: true, since: 'now', include_docs: true})
    .on('change', (change) => {
      /* keeps view in "editing mode" between data storages */
      let focus1 = document.activeElement.getAttribute('ident');
      let focus2 = document.activeElement.getAttribute('field');
      if (focus1 === null) currentEditing = '';

      /*
      Normally each time you edit a field it gets saved as soon as you leave
      the field or hit enter. The Result is that you need to double click again
      to edit the next field. The function below let you edit entire rows.
      */
      $timeout(() => {
        stayEditable(focus1, focus2, currentEditing);
      }, 300);

      /* Updates view when data changes in db.*/
      vm.updateScopeVars(change);
      vm.findProjcts();
      vm.findTaskProject();
    });

    /* Collects data from view beforehand for storage */
    $scope.newItemKeyPressHandler = () => {
      vm.addItem(write());
    };

    /* Does item exist? For yes, updates revision, than requets updating item.
    Else requests creation.*/
    vm.addItem = (item) => {
      db.get(item._id).then((doc) => {
        item._rev = doc._rev;
      }).then(() => {
        vm.saveItem(item);
      }).catch((err) => {
        console.log('Item does not exist yet. Creating now');
        vm.saveItem(item);
      });
    };

    /* After checking for exisitng item it saves it with this function */
    vm.saveItem = (item) => {
      /**
       * Async: We wait until the item is converted before storing in db.
       */
      async function f1() {
        if (item.type === 'aufwand') {
          item = await timeFactory.convert(item);
        }
        $timeout(() => {
          db.put(item)
            .then((result) => {
              console.log('Successfully posted a item!');
            }).catch((err) => {
              console.log('I am not happy because of: ' + err);
            });
        }, 100);
      };
      f1();
    };

    vm.removeItem = (item) => {
      db.get(item._id).then((doc) => {
        item._rev = doc._rev;
      }).then(() => {
        db.remove(item)
          .then((result) => {
            console.log('Successfully removed a item!');
          }).catch((err) => {
            console.log('I am not happy because of: ' + err);
          });
      }).catch((err) => {
        console.log('There is nothing to remove: ' + err);
      });
    };

    /* Double click handler in main window itemlist */
    vm.itemDblClicked = (item, $event) => {
      let div = document.getElementById('li_' + item._id);
      /* eslint-disable-next-line */
      let inputEdit = document.querySelector('[ident="input_' + item._id + '"][field=' + event.currentTarget.getAttribute('field') + ']');

      div.classList.add('editing');
      currentEditing = div.getAttribute('id');
      inputEdit.focus();
    };

    /* Checks for enter keypresses and triggers blur */
    vm.itemKeyPressed = ($event) => {
      let inputEdit;

      if (event.keyCode === ENTER_KEY) {
        inputEdit = event.currentTarget;
        currentEditing = '';
        $('.editing').removeClass('editing');
        inputEdit.blur();
      }
    };

    /* On Blur it requests to save data inside a field */
    vm.itemBlurred = (item, $event) => {
      /** While changing UI we need this IF */
      if (typeof event.target.value === 'undefined') {
        event.target.value = event.target.innerHTML;
      }
      /* Before storage dates has to be converted into a date-object.
      Otherwise Angular throws errors */
      item = upsert(item);
      vm.addItem(item);
    };

    /* Search */
    vm.search = ($event) => {
      db.find(findInComments(event.target.value))
        .then((doc) => {
          timeFactory.convert(doc.docs)
            .then((docs) => {
              $scope.items = docs;
              $scope.$digest();
            });
        });
    };

    /* Delete Data on button click */
    vm.delete = (item) => {
      $scope.timer.removeTimer();
      vm.removeItem(item);
    };

    /* Select value for "project" in comboBox from anchor list */
    vm.projectClicked = (item, i, $event) => {
      listenerComboBox(event);
      vm.findTaskProjectModal(item);
      vm.findTaskOnSelect(item, i);
    };

    /* Select value for "task" in ComboBox from anchor list */
    $scope.taskClicked = (item, i, $event) => {
      listenerComboBox(event);
      vm.findTaskOnSelect(item, i);
    };

    vm.changeSW = (item, i, $event) => {
      /* eslint-disable-next-line */
      let id = $scope.items.findIndex(arr => arr._id == item._id) + 1;
      listenerComboBox(event);
      vm.findTaskOnSelect();
      item.project = $($('.stopwatch:nth-child(' + id + ')')
      .find('input')[0])
      .val();
      item.task = $($('.stopwatch:nth-child(' + id + ')')
      .find('input')[1])
      .val();
      vm.addItem(item);
    };
    /* Pause expenditures deletes themselfs when age is lower 60s */
    vm.selfDestroy = (item) => {
      vm.removeItem(item);
    };

    /**
     * The actual timer for the stopwatch
     */
    function Timer() {
      let st;
      let initializing = false;
      if (typeof st === 'undefined') {
        st = 0;
      }

      /* angular watch-task who deletes the last pause entry if
      it is younger than 60 secs. */
      $scope.$watch('items', (newVal, oldVal) => {
        let id;
        if (newVal !== oldVal &&
          $scope.items &&
          $scope.items.find &&
          initializing) {
          /* eslint-disable-next-line */
          id = $scope.items.findIndex(arr => arr.project === 'Pause' ||
          arr.project === 'pause' ||
          arr.project === '');
          let item = $scope.items[id];
          if (item) {
            /* eslint-disable-next-line */
            this.play(item);
          }
          initializing = false;
        }
      });

      /**
       *
       * @param {*} params vv
       */
      function time(params) {
        if (vm.t) $scope.timer.removeTimer();
        vm.t = $interval(() => {
          add(params);
        }, 1000, 0, false);
      }
      /**
       *
       * @param {*} params same as above
       */
      function add(params) {
        /* Writing the actual Seconds of the timer into the view */
        st++;

        $scope.items[params.id].time = Math
        .floor(moment.duration(st, 'seconds').asHours()) + ':' +
        moment.duration(st, 'seconds').minutes() + ':' +
        moment.duration(st, 'seconds').seconds();

        if (params.query && params.query !== '') {
          vm.addItem(params.query($scope.items[params.id]), params.update);
        }
      }
      /*
      Starts a stopwatch.
      The Stopwatch-ID of the scope objects needs to be retrieved beforehand.
      Inside the interval function, Javascript can´t handle to get the Id
      of the scope-object and also at the same writing
      the new data into the view.
      */
      /* eslint-disable-next-line */
      this.play = (item) => {
        $scope.timer.removeTimer();
        st = moment.duration(timeFactory.converter(item).time).asSeconds();
        /* eslint-disable-next-line */
        let id = $scope.items.findIndex(arr => arr._id == item._id);
        let params = {
          /* eslint-disable-next-line */
          id: $scope.items.findIndex(arr => arr._id == item._id),
          query: writeStopWatch,
          update: true,
        };
        time(params);
      };
      /* eslint-disable-next-line */
      this.pause = () => {
        $scope.timer.removeTimer();
        vm.addItem(createPause());
        initializing = true;
      };
      /* eslint-disable-next-line */
      this.stop = () => {
        $scope.timer.removeTimer();
        /* eslint-disable-next-line */
        let item = $scope.items.find(arr => arr.project === 'Pause' || arr.project === 'pause');

        if (item && moment.duration((item).time).asSeconds() < 60) {
          $scope.timer.removeTimer();
          vm.delete(item);
          console.log('Deleted Pause because its to short' +
          'with under 60 Seconds.');
        }
      };
      /* Adds a new stopwatch */
      /* eslint-disable-next-line */
      this.newStopWatch = () => {
        vm.addItem(newStopWatch());
        $scope.timer.removeTimer();
        initializing = true;
      };
      /* eslint-disable-next-line */
      this.removeTimer = () => {
        $interval.cancel(vm.t);
      };
    }
    $scope.timer = new Timer();


    /* Shows Stopwatch in small or  bigger form. */
    vm.minMaxSW = (bool) => {
      if (!bool) {
        ipcRenderer.send('resize', height = 600);
      } else {
        ipcRenderer.send('resize', height = 50);
      }
    };
    $scope.onOffSW = () => {
      ipcRenderer.send('minmax', '');
    };
  };

  /* Allows to use more than one application for Angular */
  angular.element(document).ready(() => {
    angular.bootstrap(document.getElementById('aufwaende'), ['app.main']);
  });
})();
