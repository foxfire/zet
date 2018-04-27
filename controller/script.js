/*jshint esversion: 6 */ 
(function () {
  'use strict';
}());
// Basiswerte werden eingestellt für diese App
window.$ = window.jQuery = require('jquery');
var moment = require('moment');
require('moment-duration-format');
require('jquery/dist/jquery');
require('popper.js/dist/umd/popper');
require('angular');
require('angular-route');
require('angular-content-editable');
require('bootstrap/dist/js/bootstrap');

const path = require('path');
Folder = path.join('node_modules', 'font-awesome', 'css', 'font-awesome.min.css');
var head = document.getElementsByTagName('head')[0];
var link = document.createElement('link');
var currentEditing;
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = Folder;
link.media = 'all';
head.appendChild(link);

var ENTER_KEY = 13,
  newTodoDom = $('#new-todo'),
  newToDom = $('#create-item'),
  syncDom = $('#sync-wrapper'),
  db = new PouchDB('zet'),
  remoteCouch = "http://localhost:5984/todos";
  PouchDB.plugin(require('pouchdb-find'));
  PouchDB.plugin(require('pouchdb-upsert'));
  const {ipcRenderer} = require('electron');
  db.createIndex({
    index: {
      fields: ['start']
    }
  });

//Datum wird in Datumsfeldern auf den aktuellen Tag gesetzt als Defaultwert.


// Initialise a sync with the remote server
function sync() {
  syncDom.setAttribute('data-sync-state', 'syncing');
  var opts = { live: true };
  db.sync(remoteCouch, opts, syncError);
}

// There was some form or error syncing
function syncError() {
  syncDom.setAttribute('data-sync-state', 'error');
}

if (remoteCouch) {
  //sync();
}
