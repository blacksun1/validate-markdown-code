"use strict";

const Package = require("../package.json");


exports.displayUsage = function() {
  console.log(
`${Package.name} v${Package.version}

Just give it a filename`);
};
