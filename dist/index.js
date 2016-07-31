"use strict";

// Includes

const Chalk = require("chalk");
const Config = require("./config.js")
const FsPromise = require("fs-promise");
const MarkdownIt = require("markdown-it");
const Report = require("./report");
const RunCode = require("./run-code");


// Internals

const internals = {}

internals.ejectErrorFromChain = function(err) {

  process.nextTick(() => {

    throw err;
  });
};


// Exports

exports.run = function(filename) {

  const mdIt = new MarkdownIt();
  const errors = [];
  let currentCode;

  let results = FsPromise.readFile(filename, {"encoding": "utf8"})
    .then(mdIt.parse.bind(mdIt))
    .then(data => data.filter(token => token.tag === "code" && token.info === "js"))
    .catch(err => {
      Config.displayUsage();
      console.error(err.message);
      return [];
    })
    .then(data => {

      if (!data || data.length === 0) {
        return;
      }

      for (let token of data) {
        results = results
          .then(() => {
            const code = token.content;
            currentCode = code;
            return RunCode.doesCodeRun(filename, code);
          })
          .then(() => process.stdout.write("."))
          .catch(err => {
            process.stdout.write(Chalk.red("."));
            errors.push({
              code: currentCode,
              error: err
            });
          })
          .catch(err => console.error(Chalk.red(err)));
      }

      results = results
        .then(Report.reportResults.bind(internals, errors))
        .catch(internals.ejectErrorFromChain);

    })
};
