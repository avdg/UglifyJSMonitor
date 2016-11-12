#! /usr/bin/env node

"use strict";

var fs = require("fs");
var path = require("path");
var yargs = require("yargs");

var file = require("../lib/file.js");

var ARGS = yargs.usage(
        "$0 tests.txt --from inputDir --to outputDir\n\n" +
        "Copies tests that are listed from an existing (test262) dir into a new dir.\n" +
        "Format input files: every line contains a path to a file to be copied."
    )
    .describe("h",    "Get help")
    .describe("from", "Test262 root path to copy tests from")
    .describe("to",   "test262 root path to copy tests to")

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
    let dest = path.join(ARGS.to, "test", tests[i]);
    file.mkdir(path.dirname(dest));
    fs.writeFileSync(dest, fs.readFileSync(path.join(ARGS.from, "test", tests[i]), {encoding: 'utf-8'}));
}

var harnessFiles = fs.readdirSync(path.join(ARGS.from, "harness"));
file.mkdir(path.join(ARGS.to, "harness"));
for (let i = 0; i < harnessFiles.length; i++) {
    let stats = fs.statSync(path.join(ARGS.from, "harness", harnessFiles[i]));

    if (stats.isDirectory()) {
        continue;
    }

    fs.writeFileSync(path.join(ARGS.to, "harness", harnessFiles[i]), fs.readFileSync(path.join(ARGS.from, "harness", harnessFiles[i]), {encoding: 'utf-8'}));
}
