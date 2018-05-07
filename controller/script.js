/** Basiswerte werden eingestellt für diese App */
window.$ = window.jQuery = require('jquery');
moment = require('moment');
require('moment-duration-format');
require('jquery/dist/jquery');
require('popper.js/dist/umd/popper');
require('angular');
require('angular-route');
require('angular-content-editable');
require('bootstrap/dist/js/bootstrap');

const path = require('path');
Folder = path.join('node_modules', 'font-awesome', 'css',
'font-awesome.min.css');

let currentEditing;
let ENTER_KEY = 13;
let db = new PouchDB('zet');
let remoteCouch = 'http://localhost:5984/todos';

let head = document.getElementsByTagName('head')[0];
let link = document.createElement('link');
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = Folder;
link.media = 'all';
head.appendChild(link);


PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-upsert'));
ipcRenderer = require('electron');
db.createIndex({
  index: {
    fields: ['start'],
  },
});

module.exports = {
  currentEditing: currentEditing,
  ENTER_KEY: ENTER_KEY,
  remoteCouch: remoteCouch,
};
