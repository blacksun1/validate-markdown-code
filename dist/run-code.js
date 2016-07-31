"use strict";

// Includes

const Fs = require("fs");
const Module = require("module");
const Path = require("path");
const Vm = require("vm");


// Internals

const internals = {}

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

      const myPackageFilename = Path.join(Path.dirname(contextModule.filename), "package.json");
      let myPackage = JSON.parse(Fs.readFileSync(myPackageFilename, {"encoding": "utf8"}));

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

internals.wrapCode = function(code) {

  return {
    "lineOffset": -17,
    "code": `"use strict";

function _internalDone(error) {
  process.removeListener("unhandledRejection", _unhandledRejectionHandler);
  __done(error);
}

function _unhandledRejectionHandler(error) {
  process.nextTick(() => {
    console.log("unhandledRejection");
    _internalDone(error);
  });
}

process.on("unhandledRejection", _unhandledRejectionHandler);

function run() {
${code}
}

try {
 let result = run();

 if (result && typeof result.then === "function" && typeof result.catch === "function") {
    result = result
      .then(() => {
        _internalDone();
      })
      .catch(error => {
        _internalDone(error);
      });
 } else {
  _internalDone();
 }
} catch (error) {
  console.error(error);
  console.error(error.stack);
  _internalDone(error);
}`
  };
}

internals.contextFactory = function(contextModule, resolve, reject) {
  const myTimeout = setTimeout(() => {
    reject(new Error("Code timed out"));
  }, 10000);

  return {
    "clearTimeout": clearTimeout,
    "console": console,
    "module": contextModule,
    "process": process,
    "require": internals.requireWithContext.bind(internals, contextModule),
    "setTimeout": setTimeout,
    __done: function(error) {
      clearTimeout(myTimeout);
      if (error) {
        return reject(error);
      }
      return resolve();
    }
  };
};


// Exports

exports.doesCodeRun = function(filename, code) {

  return new Promise(function(resolve, reject) {

    process.nextTick(() => {
      const wrappedCode = internals.wrapCode(code);

      const script = new Vm.Script(wrappedCode.code, {
        "filename": filename,
        "lineOffset": wrappedCode.lineOffset
      });

      const contextModule = internals.createModuleContext(filename);
      const context = internals.contextFactory(contextModule, resolve, reject);

      const scriptContext = Vm.createContext(context);

      script.runInContext(scriptContext);
    });
  });
}
