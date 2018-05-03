/*jshint esversion: 6 */
(function() {
	'use strict';
	//the application code is shared by the mainwindow and the stoppwatch-window
	angular
		.module('app.main', ['angular-content-editable'])
		.config(function (contentEditableProvider) {
			contentEditableProvider.configure({
				singleLine: true, // single line for all elements
				focusSelect: false
			});
		})
		.controller('mainApp', mainApp)
		.controller('explorer', explorer);

	mainApp.$inject = ['time_factory','$scope', '$timeout', '$filter', '$interval', '$document'];
	var vm;
	function mainApp(time_factory, $scope, $timeout, $filter, $interval, $document) {
		/* jshint validthis: true */
		vm = this;

		$scope.start = {
			value: new Date(moment().format("YYYY-MM-DD"))
		};

		$scope.end = {
			value: new Date(moment().format("YYYY-MM-DD"))
		};

		$scope.createStart = {
			value: new Date(moment().format("YYYY-MM-DDThh:mm"))
		};

		$scope.createEnd = {
			value: new Date(moment().format("YYYY-MM-DDThh:mm"))
		};

		/*Assures that Angular gets valid date-objects for date input fields*/
		vm.isBig = false;

		let currentEditing;

		/*Find all Projects*/
		vm.findProjcts = () => {
			db.find(findProjects())
				.then(function (doc) {
					$scope.$apply(() => {
						$scope.projects = doc.docs;
					});
				});
		};

		/* Find all expenditures from today. */
		vm.findAufwand = () => {
			$document.ready(function () {
				db.find(aufwandQuery())
					.then(function (doc) {
						time_factory.convert(doc.docs).then(function (docs) {
							$scope.$apply(() => {
								$scope.items = docs;
								vm.findTaskProjectSW(docs);
							});
						});
					});
			});
		};

		/*
		Updates normally affect the whole UI. This function only updates locally for frequently changing stuff
		like stopwatch-timer.
		*/
		vm.getUpdateObject = (orig, current) => {
			//list for properties where UI should not be redrawn 
			let notUpdate = ['time', '_rev', 'lend2'];
			let switch1 = true;
			/* jshint ignore:start */
			async function iterate() {

				for (let prop in orig) {

					let f1 = await orig[prop].toString().trim();
					let f2 = await current[prop].toString().trim();

					if (await f1 !== f2 || await prop === "time") {
						orig[prop] = await current[prop];

						if (notUpdate.indexOf(prop) === -1) {
							switch1 = false;
							break;
						}
					}
				}
			}
			/* jshint ignore:end */
			iterate();
			if (switch1) {
				$scope.$digest();
			} else {
				vm.findAufwand();
			}
		};
		/** Checks for changes in scope and only updates the specific part of the ui that has changed. */
		vm.updateScopeVars = (change) => {
			let id = $scope.items.findIndex(arr => arr._id == change.doc._id);
			if (id !== -1 && !change.deleted) {
				let updatedItem = vm.getUpdateObject($scope.items[id], change.doc);
			} else {
				vm.findAufwand();
			}
		};

		/* Find all tasks in project */
		vm.findTaskProject = () => {
			db.find(findTasksFromProject())
				.then(function (doc) {
					$scope.$apply(() => {
						$scope.tasks = doc.docs;
					});
				});
		};

		//Find task in project for item creation
		vm.findTaskProjectModal = (project) => {
			db.find(findModalTasksFromProject(project))
				.then(function (doc) {
					$scope.$apply(() => {
						$scope.mtasks = doc.docs;
					});
				});
		};

		//Find Tasks on selection
		vm.findTaskOnSelect = (project, i) => {
			db.find(findModalTasksFromProject(project, i))
				.then(function (doc) {
					$scope.$apply(() => {
						$scope.mtasks[i] = doc.docs;
					});
				});
		};

		//Find Task in Projekts for Stoppwatch
		vm.findTaskProjectSW = (items) => {
			let item;
			let collection = [];
			let finishedCollection = [];

			for (let i = 0; i < items.length; i++) {
				item = items[i];
				collection.push(
					db.find(findModalTasksFromProject(items[i].project))
						.then(function (doc) {
							return doc.docs;
						})
				);
				if (i === items.length - 1) {
					finishedCollection = collection;

					Promise.all(finishedCollection)
						.then((dataAll) => { // jshint ignore:line
							$scope.$apply(() => {
								$scope.mtasks = dataAll;
							});
						});
				}
			}
		};

		//Changes dynamically the array that should be displayed in stopwatches task ng-repeater.
		vm.getFeeder = (i) => {
			if (typeof $scope.mtasks !== "undefined") {
				return $scope.mtasks[i];
			}
		};

		//Initial calls to launch the UI. You can find the queries for pouchDB in queries.js
		//Find all expenditures from today.
		vm.findAufwand();

		//Find all projects.
		vm.findProjcts();


		//Find all tasks from project
		$scope.filterAufwand = function () {
			vm.findTaskProject();
			vm.findAufwand();
		};

		//Updates view when data changes in db.
		db.changes({ live: true, since: 'now', include_docs: true }).on('change', (change) => {
			//keeps view in "editing mode" between data storages
			let focus1 = document.activeElement.getAttribute('ident');
			let focus2 = document.activeElement.getAttribute('field');
			if (focus1 === null) currentEditing = "";

			//Normally each time you edit a field it gets saved as soon as you leave the field or hit enter.
			//The Result is that you need to double click again to edit the next field. The function below
			//let you edit entire rows.
			$timeout(() => {
				stayEditable(focus1, focus2, currentEditing);
			}, 300); // jshint ignore:line	

			//Updates view when data changes in db.
			vm.updateScopeVars(change);
			vm.findProjcts();
			vm.findTaskProject();
		});

		//Collects data from view beforehand for storage
		$scope.newItemKeyPressHandler = () => {
			vm.addItem(write());
		};

		//Does item exist? For yes, updates revision, than requets updating item. Else requests creation.
		vm.addItem = (item) => {
			db.get(item._id).then((doc) => {
				item._rev = doc._rev;
			}).then(() => {
				vm.saveItem(item);
			}).catch((err) => {
				console.log("Item does not exist yet. Creating now");
				vm.saveItem(item);
			});
		};

		//After checking for exisitng item it saves it with this function
		vm.saveItem = (item) => {
			/* jshint ignore:start */
			async function f1() {
				if (item.type === "aufwand") {
					item = await time_factory.convert(item);
				}
				/* jshint ignore:end */
				$timeout(() => {
					db.put(item)
						.then((result) => {
							console.log('Successfully posted a item!');
						}).catch((err) => {
							console.log('I am not happy because of: ' + err);
						});
				}, 100);
			}
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
				console.log("There is nothing to remove: " + err);
			});
		};

		//Double click handler in main window itemlist
		vm.itemDblClicked = (item, $event) => {
			let div = document.getElementById('li_' + item._id);
			let inputEdit = document.querySelector('[ident="input_' + item._id + '"][field=' + event.currentTarget.getAttribute('field') + ']');

			div.classList.add('editing');
			currentEditing = div.getAttribute("id");
			inputEdit.focus();
		};

		//Checks for enter keypresses and triggers blur
		vm.itemKeyPressed = function ($event) {
			let inputEdit;

			if (event.keyCode === ENTER_KEY) {
				inputEdit = event.currentTarget;
				currentEditing = "";
				$(".editing").removeClass('editing');
				inputEdit.blur();
			}
		};

		//On Blur it requests to save data inside a field
		vm.itemBlurred = function (item, $event) {
			/** While changing UI we need this IF */
			if (typeof event.target.value === 'undefined') event.target.value = event.target.innerHTML;
			let trimmedText = event.target.value.trim();
			let target = event.currentTarget.getAttribute('field');

			//Before storage dates has to be converted into a date-object. Otherwise Angular throws errors
			item = upsert(item);

			vm.addItem(item);
		};

		//Search
		vm.search = ($event) => {
			db.find(findInComments(event.target.value))
				.then((doc) => {
					time_factory.convert(doc.docs)
						.then((docs) => {
							$scope.items = docs;
							$scope.$digest();
						});
				});
		};

		//Delete Data on button click
		vm.delete = function (item) {
			$scope.timer.RemoveTimer();
			vm.removeItem(item);
		};

		//Select value for "project" in comboBox from anchor list
		vm.projectClicked = (item, i, $event) => {
			ListenerComboBox(event);
			vm.findTaskProjectModal(item);
			vm.findTaskOnSelect(item, i);
		};

		//Select value for "task" in ComboBox from anchor list
		$scope.taskClicked = (item, i, $event) => {
			ListenerComboBox(event);
			vm.findTaskOnSelect(item, i);
		};

		vm.changeSW = (item, i, $event) => {
			let id = $scope.items.findIndex(arr => arr._id == item._id) + 1;

			ListenerComboBox(event);
			vm.findTaskOnSelect();
			item.project = $($('.stopwatch:nth-child(' + id + ')').find('input')[0]).val();
			item.task = $($('.stopwatch:nth-child(' + id + ')').find('input')[1]).val();
			vm.addItem(item);
		};
		//Pause expenditures deletes themselfs when age is lower 60s
		vm.selfDestroy = (item) => {
			vm.removeItem(item);
		};

		//The actual timer for the stopwatch
		function timer() {
			let t, st, initializing = false;
			if (typeof st === "undefined") { st = 0; }

			//angular watch-task who deletes the last pause entry if it is younger than 60 secs.
			$scope.$watch('items', (newVal, oldVal) => {
				let id;
				if (newVal !== oldVal && $scope.items && $scope.items.find && initializing) {
					id = $scope.items.findIndex(arr => arr.project === 'Pause' || arr.project === 'pause' || arr.project === '');
					let item = $scope.items[id];
					if (item) this.play(item);
					initializing = false;
				}
			});

			function time(params) {
				if (vm.t) $scope.timer.RemoveTimer();
				vm.t = $interval(() => {
					add(params);
				}, 1000, 0, false);
			}

			function add(params) {
				//Writing the actual Seconds of the timer into the view
				st++;

				$scope.items[params.id].time = Math.floor(moment.duration(st, 'seconds').asHours()) + ':'
					+ moment.duration(st, 'seconds').minutes() + ':'
					+ moment.duration(st, 'seconds').seconds();

				if (params.query && params.query !== "") {
					//$scope.items[params.id] = upsert($scope.items[params.id]);
					vm.addItem(params.query($scope.items[params.id]), params.update);
				}
			}
			//Starts a stopwatch.
			//The Stopwatch-ID of the scope objects needs to be retrieved beforehand. Inside the interval function,
			//Javascript can´t handle to get the Id of the scope-object 
			//and also at the same writing the new data into the view.
			this.play = (item) => {
				$scope.timer.RemoveTimer();
				st = moment.duration(time_factory.converter(item).time).asSeconds();
				let id = $scope.items.findIndex(arr => arr._id == item._id);
				let params = {
					id: $scope.items.findIndex(arr => arr._id == item._id),
					query: writeStopWatch,
					update: true
				};
				time(params);
			};
			this.pause = () => {
				$scope.timer.RemoveTimer();
				vm.addItem(createPause());
				initializing = true;
			};
			this.stop = () => {
				$scope.timer.RemoveTimer();
				let item = $scope.items.find(arr => arr.project === 'Pause' || arr.project === 'pause');

				if (item && moment.duration((item).time).asSeconds() < 60) {
					$scope.timer.RemoveTimer();
					vm.delete(item);
					console.log("Deleted Pause because its to short with under 60 Seconds.");
				}
			};
			//Adds a new stopwatch
			this.newStopWatch = () => {
				vm.addItem(newStopWatch());
				$scope.timer.RemoveTimer();
				initializing = true;
			};
			this.RemoveTimer = () => {
				$interval.cancel(vm.t);
			};
		}
		$scope.timer = new timer();


		//Shows Stopwatch in small or  bigger form.
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

	//Controller to display projects and tasks in a tree like structure
	function explorer($scope, $timeout, $document, $controller) {
		
		/*Inherits from itemFabric*/
		$controller('mainApp', { $scope: $scope });

		vm.findProjectsOrTasks = () => {
			db.find(findProjectsOrTasks())
				.then(function (doc) {
					$scope.$apply(() => {
						$scope.tree = doc.docs;
					});
				});
		};

		//Retrieves projects and tasks for the project tree and keeps it fresh.
		vm.findProjectsOrTasks();

		db.changes({ live: true, since: 'now', include_docs: true }).on('change', () => {
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
	};

	//Allows to use more than one application for Angular
	angular.element(document).ready(() => {
		angular.bootstrap(document.getElementById("aufwaende"), ["app.main"]);
	});
})();