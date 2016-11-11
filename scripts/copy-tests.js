#! /usr/bin/env node

"use strict";

// mkdir comes from file.mkdir on https://github.com/gruntjs/grunt
// Like mkdir -p. Create a directory and any intermediary directories.
var pathSeparatorRe = /[\/\\]/g;
var mkdir = function(dirpath, mode) {
  // Set directory mode in a strict-mode-friendly way.
  if (mode == null) {
    mode = parseInt('0777', 8) & (~process.umask());
  }
  dirpath.split(pathSeparatorRe).reduce(function(parts, part) {
    parts += part + '/';
    var subpath = path.resolve(parts);
    if (!fs.existsSync(subpath)) {
      try {
        fs.mkdirSync(subpath, mode);
      } catch (e) {
        throw new Error('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
      }
    }
    return parts;
  }, '');
};

var fs = require("fs");
var path = require("path");
var yargs = require("yargs");

var ARGS = yargs.usage(
        "$0 tests.txt --from inputDir --to outputDir\n\n" +
        "Copies tests that are listed from an existing (test262) dir into a new dir.\n" +
        "Format input files: every line contains a path to a file to be copied."
    )
    .describe("h",    "Get help")
    .describe("from", "Path to copy tests from")
    .describe("to",   "Path to copy tests to")

    .alias("h", "help")
    .wrap(80)
    .help()

    .demand(["from", "to"])

    .argv;

if (ARGS.h || ARGS.help) {
    process.exit(0);
}

var tests = [];

// For every input file, read content and insert in hash table
for (let i = 0; i < ARGS._.length; i++) {
    tests = tests.concat(fs.readFileSync(ARGS._[i], {encoding: 'utf-8'}).split(/\n/g));
}

console.log("Found " + tests.length + " tests");

// For every hash table element, copy file from path to destination
for (let i = 0; i < tests.length; i++) {
    let dest = path.join(ARGS.to, tests[i]);
    mkdir(path.dirname(dest));
    fs.writeFileSync(dest, fs.readFileSync(path.join(ARGS.from, tests[i]), {encoding: 'utf-8'}));
}
