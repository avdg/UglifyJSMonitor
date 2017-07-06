[![Running time return value](https://img.shields.io/badge/Running%20Time%20Return%20Value-0%20$-red.svg)](#)
[![Dependency Status](https://david-dm.org/avdg/UglifyJSMonitor.svg)](https://david-dm.org/avdg/UglifyJSMonitor)
[![Dev dependency Status](https://david-dm.org/avdg/UglifyJSMonitor/dev-status.svg)](https://david-dm.org/avdg/UglifyJSMonitor#info=devDependencies)
[![Code Climate](https://codeclimate.com/github/avdg/UglifyJSMonitor/badges/gpa.svg)](https://codeclimate.com/github/avdg/UglifyJSMonitor)

# UglifyJSMonitor
Prototyping automated UglifyJS Monitor tools

## Requirements
- nodejs (development done on node 6, might work on few earlier versions)
- npm (mostly installed together with nodejs)
- python 2.7
- A c/c++ compiler that can keep npm happy

## Main tools

### Test262 runner tool for UglifyJS
> Make sure npm install is run after downloading UglifyJSMonitor

- Run `node .` to run index.js
- All dependencies are set up on the background (but not updated)
- On menu `Press enter to continue, 'config' to change settings or press ctrl + c to exit`
  - Press enter runs the tests with the listed settings
  - You can type `config` and press enter to change some settings
    - [ ] Make sure all branches are correct
    - [ ] Make sure to fetch all branches after setting them correct
- Running the tests takes a lot of times, let it run on the background for a few hours (at least 2-3 hours)
- Logs can be found in `build/logs/`, logs are not used by the program once processed.

### ecmaTester tool (aka the fake javascript execution machine)
> Should only be used with the test262 runner as `--command` parameter

This tool is used to convert test262 tool into minified code and run it.
In case there is an error, it will run the unminified code as well.
This is done to fetch additional data and to make sure to determine if the
script should have been executed successfully.

It's expecting as parameter a path to the test (like `ecmaTester foo.js`).
And is for the time being not configurable without changing the code.

Note that the tool doesn't know if the test is expected to fail.

### ecmaTestProcessor tool
> node scripts/ecmaTester.js input1.logs, input2.logs --output logs.md

This tool, located under `scripts/ecmaTestProcessor.js` is used to convert raw test262 logs into
a bit more readable markdown files. Just execute `node scripts/ecmaTestProcessor --help`
for more information on how to use it.

## Doing stuff manual

Not all features are automated yet as the current tool doesn't support extensive customization.
However, with clever workarounds, one could use the main tool to test out other repositories.

Just add remotes to `build/dependencies/<pick a repo you want>`, or change branches there.
They are just git repositories. Do not forget that some of these repo's require `npm install` as well.

By editing the settings object in `scripts/runner.js` its possible to change settings that
couldn't be changed using the tool. This can be handy in case you want to run the test262
test with custom parameters (for example running under `node --harmony`).