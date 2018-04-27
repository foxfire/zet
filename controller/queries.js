/*jshint esversion: 6 */ 
//PouchDB needs a Index for a specific search request type, which it can use to sort the results.
db.createIndex({
  index: {
    fields: ['start']
  }
});

// The following functions provides patterns for requests against the database.
function aufwandQuery() {
  let start;
  let end;

  if ($("#start").length !== 0) {
    start = {
      $gte: new Date(moment($("#start").val() + "T00:00").toISOString(true))
    };
  } else {
    start = {
      $gt: true
    };
  }
  if ($("#end").length !== 0) {
    end = {
      $lte: new Date(moment($("#end").val() + "T24:00").toISOString(true))
    };
  } else {
    end = {
      '$exists': true
    };
  }
  return {
    selector: {
      type: 'aufwand',
      project: $("#project_selector option:selected").val() || { '$exists': true },
      task: $("#task_selector option:selected").val() || { '$exists': true },
      start: start,
      end: end
    },
    sort: [{ start: 'desc' }]
  };
}
function findTasksFromProject() {
  return {
    selector: {
      type: 'task',
      project: $("#project_selector option:selected").text()
    }
  };
}
function findModalTasksFromProject(project) {
  return {
    selector: {
      type: 'task',
      project: project
    }
  };
}
function findProjectsOrTasks() {
  return {
    selector: {
      $or: [
        { type: 'project' },
        { type: 'task' }
      ]
    }
  };
}
function findInComments(comment) {
  return {
    selector: {
      type: 'aufwand',
      start: { $gt: true },
      comment:
        { $regex: RegExp(comment, "i") } //i => case insensitive.
    },
    sort: ['start']
  };
}
function findProjects() {
  return {
    selector: { type: 'project' }
  };
}
//Patterns to describe which kind of data PouchDB should use for a specific use case.
//Writes new expenditure,task and project entrys from the modal view.
function write() {
  return writeItem(
    type = $('#new-item .category option:selected').val().toLowerCase(),
    project = $('#new-item .newproject').val(),
    task = $('#new-item .newtask').val(),
    start = new Date(moment($('#new-item .newstarttime').val()).format("YYYY-MM-DDTHH:mm")),
    end = new Date(moment($('#new-item .newendtime').val()).format("YYYY-MM-DDTHH:mm")),
    lstart1 = moment(start).format("DD.MM.YYYY"),
    lstart2 = moment(start).format("HH:mm"),
    lend1 = moment(end).format("DD.MM.YYYY"),
    lend2 = moment(end).format("HH:mm"),
    comment = $('#new-item .newbeschreibung').val()
  );
}
//Used for the stopwatch to be able to write quick expenditures
function newStopWatch() {
  return writeItem(
    type = 'aufwand',
    project = '',
    task = '',
    start = new Date(moment().format("YYYY-MM-DDTHH:mm")),
    end = new Date(moment().format("YYYY-MM-DDTHH:mm")),
    //time = new Date(moment("00:00:00").format("HH:mm:ss")),
    time = '00:00:00',
    lstart1 = moment().format("DD.MM.YYYY"),
    lstart2 = moment().format("HH:mm"),
    lend1 = moment().format("DD.MM.YYYY"),
    lend2 = moment().format("HH:mm"),
    comment = ""
  );
}
//Upserts the last edited entry of a stop watch 
function writeStopWatch(item) {
  let save = {};
  item._id = item._id;
  item.end = new Date(moment().format("YYYY-MM-DDThh:mm"));
  return item;
}
//Creatures an "pause"-expenditure.
function createPause() {
  return writeItem(
    type = 'aufwand',
    project = 'Pause',
    task = 'Pausentask',
    start = new Date(moment().format("YYYY-MM-DDTHH:mm")),
    end = new Date(moment().format("YYYY-MM-DDTHH:mm")),
    lstart1 = moment().format("DD.MM.YYYY"),
    lstart2 = moment().format("HH:mm"),
    lend1 = moment().format("DD.MM.YYYY"),
    lend2 = moment().format("HH:mm"),
    comment = ""
  );
}
//Provides patterns for the the functions above to use. Espcially in the modal window different kinds of store patterns are needed
//
function writeItem(item) {
  if (type === "project") {
    return {
      _id: project.toLowerCase(),
      project: project,
      type: type,
      comment: comment
    };
  }
  if (type === "task") {
    return {
      _id: task.toLowerCase(),
      project: project,
      task: task,
      type: type,
      comment: comment
    };
  }
  if (type === "aufwand") {
    return {
      _id: moment().toISOString(true),
      project: project,
      task: task,
      start: start,
      end: end,
      lstart1: lstart1,
      lstart2: lstart2,
      lend1: lend1,
      lend2: lend2,
      time: "00:00:00",
      comment: comment,
      type: type || 'aufwand'
    };
  }
}
//Upserts the labels for the main window entrys.
function upsert(item) {
  item.lstart1 = moment(item.start).format("DD.MM.YYYY");
  item.lstart2 = moment(item.start).format("HH:mm");
  item.lend1 = moment(item.end).format("DD.MM.YYYY");
  item.lend2 = moment(item.end).format("HH:mm");
  return item;
}