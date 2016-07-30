"use strict";

// Includes

const Fs = require("fs");
const FsPromise = require("fs-promise");
const MarkdownIt = require("markdown-it");
const Module = require("module");
const Path = require("path");
const Vm = require("vm");
const Chalk = require("chalk");

// Internals

const internals = {}

internals.ejectErrorFromChain = function(err) {

  process.nextTick(() => {

    throw err;
  });
};

internals.createModuleContext = function(filename) {

  const newModule = new Module(".", null);
  newModule.filename = filename;
  newModule.paths = [Path.join(Path.dirname(filename), "node_modules")];

  return newModule;
};

internals.requireWithContext = function(contextModule, id) {

  let module = id;

  // If the module being requested is the *current module*.
  if (id[0] !== ".") {

    try {

      let myPackage = JSON.parse(Fs.readFileSync(Path.join(Path.dirname(contextModule.filename), "package.json"), {"encoding": "utf8"}));

      if (myPackage.name === module) {
        module = "./";
      }
    }
    catch(err) {

      console.error(err);
      return;
    }
  }

  return contextModule.require(module)
}

internals.doesCodeRun = function(filename, code) {

  const strictCode = "\"use strict\";\n\n" + code;
  const script = new Vm.Script(strictCode, {
    "filename": filename
  });

  const contextModule = internals.createModuleContext(filename);
  const context = {
    "require": internals.requireWithContext.bind(internals, contextModule),
    "module": contextModule,
    "console": {
      "log": function() {return;},
      "error": function() {return;}
    }
  };

  const scriptContext = Vm.createContext(context);
  script.runInContext(scriptContext);

}

// Externals

exports.run = function(filename) {

  const mdIt = new MarkdownIt();
  const errors = [];
  let currentCode;

  let results = FsPromise.readFile(filename, {"encoding": "utf8"})
    .then(mdIt.parse.bind(mdIt))
    .then(data => data.filter(token => token.tag === "code" && token.info === "js"))
    .then(data => {

      for (let token of data) {
        results = results
          .then(() => {
            const code = token.content;
            currentCode = code;
            return internals.doesCodeRun(filename, code);
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

      results = results.then(() => console.log("\nAll done."));
      results = results.then(() => {

        if (errors.length === 0) {
          console.log(Chalk.green("No errors. Great stuff."))
          return;
        }

        console.log(Chalk.red("Errors found in the following code\n"));

        for (const error of errors) {
          console.log(Chalk.red(`Error of ${error.error}`));
          console.log(error.code);
          console.log();
        }
      });

      results = results
        .catch(internals.ejectErrorFromChain);

    })
}
