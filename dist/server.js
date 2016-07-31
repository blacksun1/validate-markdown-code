"use strict";

// Includes

const App = require("./");
const Config = require("./config.js")
const Path = require("path");


// Internals

const internals = {};

if (process.argv.length !== 3) {
  Config.displayUsage();
  process.exit(1);
}

internals.filename = Path.resolve(process.argv[2]);
App.run(internals.filename);
