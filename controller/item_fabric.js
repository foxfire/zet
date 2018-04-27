/*jshint esversion: 6 */ 

//the application code is shared by the mainwindow and the stoppwatch-window
let app = angular.module('application', ['angular-content-editable'])
	.config(function(contentEditableProvider) {
		contentEditableProvider.configure({
			singleLine: true, // single line for all elements
			focusSelect: false
		});
	});

app.controller('itemFabric', function ($scope, $timeout, $filter, $interval, $document) {

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

	//Assures that Angular gets valid date-objects for date input fields
	$scope.isBig = false; 

	let currentEditing;

	function converter (docs)  {
			if(docs){
				docs.start = new Date(docs.start);
				docs.end = new Date(docs.end);
				if(docs.time) {
					if(moment(docs.time, "HH:mm:ss").isValid()){
						docs.time = moment(docs.time, "HH:mm:ss").format("HH:mm:ss");
					}else{
						db.get(docs._id).then((doc) => {
							docs.time = doc.time;
						});
					}
				}
			}
			return docs;
	}

	function convert (docs) {
		return new Promise((resolve, reject) => {
			if(docs.length){
				for (let k in docs) {
					converter(docs[k]);
				}
				Promise.all(docs)
				.then((dataAll) => { // jshint ignore:line
					resolve(dataAll);
				});
			}else{
				resolve(converter(docs));
			}
		});
	}

	//Find all Projects
	$scope.findProjcts = () => {
		db.find(findProjects())
			.then(function (doc) {
				$scope.$apply(() => {
					$scope.projects = doc.docs;
				});
			});
	};

	//Find all expenditures from today.
	$scope.findAufwand = () => {
		$document.ready(function () {
			db.find(aufwandQuery())
				.then(function (doc) {
					convert(doc.docs).then(function (docs) {
						$scope.$apply(() => {
							$scope.items = docs;
							$scope.findTaskProjectSW(docs);
						});
					});
				});
		});
	};

	//Updates normally affect the whole UI. This function only updates locally for frequently changing stuff
	//like stopwatch-timer.
	$scope.getUpdateObject = (orig, current) => {
		//list for properties where UI should not be redrawn 
		let notUpdate =['time','_rev', 'lend2','contime'];
		let switch1 = true;
		/* jshint ignore:start */
		async function iterate() {
			
			for (let prop in orig) {

				if (await prop === "start") {
					//console.log(current)
					//Eventuell Datumsprüfung
					//await $scope.convert(current);
				}

				let f1 = await orig[prop].toString().trim();
				let f2 = await current[prop].toString().trim();

				if (await f1 !== f2 || await prop === "time") {
					orig[prop] = await current[prop];

					if(notUpdate.indexOf(prop) === -1){
						switch1=false;
						break;
					}
				}
			}
		}
		/* jshint ignore:end */
		iterate();
		if(switch1){
			$scope.$digest();
		}else {
			$scope.findAufwand();
		}
	};

	$scope.updateScopeVars = (change) => {
		let id = $scope.items.findIndex(arr => arr._id == change.doc._id);
		if (id !== -1 && !change.deleted){
			let updatedItem = $scope.getUpdateObject($scope.items[id], change.doc);
		}else{
			$scope.findAufwand();
		}
	};

	//Find all tasks in project
	$scope.findTaskProject = () => {
		db.find(findTasksFromProject())
			.then(function (doc) {
				$scope.$apply(() => {
					$scope.tasks = doc.docs;
				});
			});
	};

	//Find task in project for item creation
	$scope.findTaskProjectModal = (project) => {
		db.find(findModalTasksFromProject(project))
			.then(function (doc) {
				$scope.$apply(() => {
					$scope.mtasks = doc.docs;
				});
			});
	};

	//Find Tasks on selection
	$scope.findTaskOnSelect = (project, i) => {
		db.find(findModalTasksFromProject(project, i))
			.then(function (doc) {
				$scope.$apply(() => {
					$scope.mtasks[i] = doc.docs;
				});
			});
	};

	//Find Task in Projekts for Stoppwatch
	$scope.findTaskProjectSW = (items) => {
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
	$scope.getFeeder = (i) => {
		if (typeof $scope.mtasks !== "undefined") {
			return $scope.mtasks[i];
		}
	};

	//Initial calls to launch the UI. You can find the queries for pouchDB in queries.js
	//Find all expenditures from today.
	$scope.findAufwand();

	//Find all projects.
	$scope.findProjcts();


	//Find all tasks from project
	$scope.filterAufwand = function () {
		$scope.findTaskProject();
		$scope.findAufwand();
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
		$scope.updateScopeVars(change);
		$scope.findProjcts();
		$scope.findTaskProject();
	});

	//Collects data from view beforehand for storage
	$scope.newItemKeyPressHandler = () => {
		$scope.addItem(write());
	};

	//Does item exist? For yes, updates revision, than requets updating item. Else requests creation.
	$scope.addItem = (item) => {
		db.get(item._id).then((doc) => {
			item._rev = doc._rev;
		}).then(() => {
			$scope.saveItem(item);
		}).catch((err) => {
			console.log("Item does not exist yet. Creating now");
			$scope.saveItem(item);
		});
	};
	
	//After checking for exisitng item it saves it with this function
	$scope.saveItem = (item) => {
		async function f1() {
			let data = await convert(item);
			console.log(data);
			$timeout(() => {
				$('#tree').treed();
			
			db.put(data)
			.then((result) => {
				console.log('Successfully posted a item!');
			}).catch((err) => {
				console.log('I am not happy because of: ' + err);
			});
			}, 300);
		}
		f1();
	};

	$scope.removeItem = (item) => {
		db.get(item._id).then((doc) => {
			item._rev = doc._rev;
		}).then(() => {
			db.remove(item)
			.then((result) => {
				console.log('Successfully posted a item!');
			}).catch((err) => {
				console.log('I am not happy because of: ' + err);
			});
		}).catch((err) => {
			console.log("There is nothing to remove: " + err);
		});
	};

	//Double click handler in main window itemlist
	$scope.itemDblClicked = (item, $event) => {
		let div = document.getElementById('li_' + item._id);
		let inputEdit = document.querySelector('[ident="input_' + item._id + '"][field=' + event.currentTarget.getAttribute('field') + ']');

		div.classList.add('editing');
		currentEditing = div.getAttribute("id");
		inputEdit.focus();
	};

	//Checks for enter keypresses and triggers blur
	$scope.itemKeyPressed = function ($event) {
		let inputEdit;
		if (event.keyCode === ENTER_KEY) {
			inputEdit = event.currentTarget;
			currentEditing = "";
			$(".editing").removeClass('editing');
			inputEdit.blur();
		}
	};

	//On Blur it requests to save data inside a field
	$scope.itemBlurred = function (item, $event) {
		/** While changing UI we need this IF */
		if(typeof event.target.value === 'undefined')event.target.value = event.target.innerHTML;
		let trimmedText = event.target.value.trim();
		let target = event.currentTarget.getAttribute('field');

		//Before storage dates has to be converted into a date-object. Otherwise Angular throws errors
		item = upsert(item);

		$scope.addItem(item);
	};


	//Search
	$scope.search = ($event) => {
		db.find(findInComments(event.target.value))
			.then((doc) => {
				$scope.convert(doc.docs)
					.then((docs) => {
							$scope.items = docs;
							$scope.$digest();
					});
			});
	};

	//Delete Data on button click
	$scope.delete = function (item) {
		$scope.timer.RemoveTimer();
		$scope.removeItem(item);
	};

	//Select value for "project" in ComboBox from anchor list
	$scope.projectClicked = (item, i, $event) => {
		ListenerComboBox(event);
		$scope.findTaskProjectModal(item);
		$scope.findTaskOnSelect(item, i);
	};

	//Select value for "task" in ComboBox from anchor list
	$scope.taskClicked = (item, i, $event) => {
		ListenerComboBox(event);
		$scope.findTaskOnSelect(item, i);
	};

	$scope.changeSW = (item, i, $event) => {
		let id = $scope.items.findIndex(arr => arr._id == item._id) + 1;

		ListenerComboBox(event);
		$scope.findTaskOnSelect();
		item.project = $($('.stopwatch:nth-child(' + id + ')').find('input')[0]).val();
		item.task = $($('.stopwatch:nth-child(' + id + ')').find('input')[1]).val();
		$scope.addItem(item);
	};
	//Pause expenditures deletes themselfs when age is lower 60s
	$scope.selfDestroy = (item) => {
		$scope.removeItem(item);
	};

	//The actual timer for the stopwatch
	function timer() {
		let t, st, initializing=false;
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
			if ($scope.t) $scope.timer.RemoveTimer();
			$scope.t = $interval(() => {
				add(params);
			}, 1000, 0, false);
		}

		function add(params) {
			//Writing the actual Seconds of the timer into the view
			st++;

			$scope.items[params.id].time =  moment("2015-01-01").startOf('day').seconds(st).format('HH:mm:ss');

			if (params.query && params.query !== "") {
				//$scope.items[params.id] = upsert($scope.items[params.id]);
				$scope.addItem(params.query($scope.items[params.id]), params.update);
			}
		}
		//Starts a stopwatch.
		//The Stopwatch-ID of the scope objects needs to be retrieved beforehand. Inside the interval function,
		//Javascript can´t handle to get the Id of the scope-object 
		//and also at the same writing the new data into the view.
		this.play = (item) => {
			$scope.timer.RemoveTimer();
			st = moment.duration(item.time).asSeconds();
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
			$scope.addItem(createPause());
			initializing = true;
		};
		this.stop = () => {
			$scope.timer.RemoveTimer();
			let item = $scope.items.find(arr => arr.project === 'Pause' || arr.project === 'pause');

			if (item && moment.duration((item).time).asSeconds() < 60) {
				$scope.timer.RemoveTimer();
				$scope.delete(item);
				console.log("Deleted Pause because its to short with under 60 Seconds.");
			}
		};
		//Adds a new stopwatch
		this.newStopWatch = () => {
			$scope.addItem(newStopWatch());
			$scope.timer.RemoveTimer();
			initializing = true;
		};
		this.RemoveTimer = () => {
			$interval.cancel($scope.t);
		};
	}
	$scope.timer = new timer();
	

	//Shows Stopwatch in small or  bigger form.
	$scope.minMaxSW = (bool) => {
		if (!bool) {
			ipcRenderer.send('resize', height = 600);
		} else {
			ipcRenderer.send('resize', height = 50);
		}
	};
	$scope.onOffSW = () => {
		ipcRenderer.send('minmax', '');
	};

});

//Controller to display projects and tasks in a tree like structure
app.controller('explorer', function ($scope, $timeout, $document, $controller) {
	/*Inherits from itemFabric*/
	$controller('itemFabric', {$scope: $scope});

	$scope.title = 'My Initial Title';

	$scope.findProjectsOrTasks = () => {
		db.find(findProjectsOrTasks())
			.then(function (doc) {
				$scope.$apply(() => {
					$scope.tree = doc.docs;
				});
			});
	};

	//Retrieves projects and tasks for the project tree and keeps it fresh.
	$scope.findProjectsOrTasks();

	db.changes({ live: true, since: 'now', include_docs: true }).on('change', () => {
		$scope.findProjectsOrTasks();
		$timeout(() => {
			$('#tree').treed();
		}, 300);
	});

	$document.ready(() => {
		$timeout(() => {
			$('#tree').treed();
		}, 300);
	});
});

//Allows to use more than one application for Angular
angular.element(document).ready(() => {
	angular.bootstrap(document.getElementById("aufwaende"), ["application"]);
});  
