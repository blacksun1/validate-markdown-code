"use string";

// Includes

const Chalk = require("chalk");


// Exports

exports.reportResults = function(errors) {
  console.log("\nAll done.")

  if (errors.length === 0) {
    console.log(Chalk.green("No errors. Great stuff."))
    return;
  }

  console.log(Chalk.red("Errors found in the following code\n"));

  for (const error of errors) {
    console.log(Chalk.red(`Error of:`));
    console.log(Chalk.red(error.error.stack));
    error.code.split("\n").forEach((line, index) => {
      console.log(Chalk.green(index + 1) + ": " + line);
    })
    console.log();
  }
};
