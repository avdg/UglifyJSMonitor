[![Running time return value](https://img.shields.io/badge/Running%20Time%20Return%20Value-0%20$-red.svg)](#)
[![Dependency Status](https://david-dm.org/avdg/UglifyJSMonitor.svg)](https://david-dm.org/avdg/UglifyJSMonitor)
[![Dev dependency Status](https://david-dm.org/avdg/UglifyJSMonitor/dev-status.svg)](https://david-dm.org/avdg/UglifyJSMonitor#info=devDependencies)

# UglifyJSMonitor
Prototyping automated UglifyJS Monitor tools

## Requirements
- nodejs (development done on node 6, might work on few earlier versions)
- npm (mostly installed together with nodejs)
- python 2.7
- A c/c++ compiler that can keep npm happy

## Test262 runner tool
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
