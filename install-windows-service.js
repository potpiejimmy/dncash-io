/*
 * Setup script for installing as a native Windows service.
 * See https://github.com/coreybutler/node-windows
 * Note: Before running this, install node-windows globally
 * and link it into node_modules:
 * npm install -g node-windows
 * npm link node-windows
 */
var Service = require('node-windows').Service;

var scriptPath = __dirname + "\\dist\\app.js";
console.log("Installing Windows service for '" + scriptPath + "'");

// Create a new service object
var svc = new Service({
  name:'dncash.io',
  description: 'The dncash.io server',
  script: scriptPath,
  nodeOptions: []
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',() => {
  console.log("Installed succesfully with name 'dncash.io', now starting...")
  svc.start();
});
svc.on('start',() => {
  console.log("Started succesfully, you're good to go.")
});
  
svc.install();
