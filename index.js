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

  return new Promise(function(resolve, reject) {

    process.nextTick(() => {
      const myTimeout = setTimeout(() => {
        reject(new Error("Code timed out"));
      }, 10000);

      // const strictCode = "\"use strict\";\n\n" + code;
      const strictCode = `
        "use strict";

        function internalDone(error) {
          process.removeListener("unhandledRejection", unhandledRejectionHandler);
          done(error);
        }

        function unhandledRejectionHandler(error) {
          process.nextTick(() => {
            console.log("unhandledRejection");
            internalDone(error);
          });
        }

        process.on("unhandledRejection", unhandledRejectionHandler);

        function run() {
          ${code}
        }

        try {
         let result = run();

         if (result && typeof result.then === "function" && typeof result.catch === "function") {
            result = result
              .then(() => {
                internalDone();
              })
              .catch(error => {
                internalDone(error);
              });
         } else {
          internalDone();
         }
        } catch (error) {
          console.error(error);
          console.error(error.stack);
          internalDone(error);
        }
      `;

      const script = new Vm.Script(strictCode, {
        "filename": filename,
        "lineOffset": -18 // This is the number of lines in strcit code before
                          // the code is inserted.
      });

      const contextModule = internals.createModuleContext(filename);
      const context = {
        "clearTimeout": clearTimeout,
        "console": console,
        "done": function(error) {
          clearTimeout(myTimeout);
          if (error) {
            return reject(error);
          }
          return resolve();
        },
        "module": contextModule,
        "process": process,
        "require": internals.requireWithContext.bind(internals, contextModule),
        "setTimeout": setTimeout
      };

      const scriptContext = Vm.createContext(context);

      script.runInContext(scriptContext);
    });
  });
}

// Externals

exports.run = function(filename) {

  process.on("unhandledRejection", function(error) {
    process.nextTick(() => {
      console.log(error);
    });
  });

  const mdIt = new MarkdownIt();
  const code = [`

  const Assert = require("assert");

  return new Promise(function(resolve, reject) {

    process.nextTick(() => {
      console.log("hello world");
      Assert.deepEqual(true, true);
    });

    setTimeout(() => {

      console.log("DING!")
      resolve();

    }, 5000);
  })

  `,
  `
  console.log("Second script now running");
  `];
  let results = internals.doesCodeRun(filename, code[0]);
  results = results.then(() => internals.doesCodeRun(filename, code[1]));

  results = results.then(() => console.log("done"));
  results = results.catch(err => console.log("error", err));

  return results;
};

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
          console.log(Chalk.red(`Error of:`));
          console.log(Chalk.red(error.error.stack));
          // console.log(error.code);
          error.code.split("\n").forEach((line, index) => {
            console.log(Chalk.green(index + 1) + ": " + line);
          })
            console.log();
        }
      });

      results = results
        .catch(internals.ejectErrorFromChain);

    })
};
