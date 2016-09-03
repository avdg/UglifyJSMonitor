const fs = require('fs');
const uglify= require('../build/dependencies/UglifyJS2/tools/node.js');
const assert = require('assert');

function parse(src) {
  uglify.minify(src, {fromString: true});
}

let passExcludes = [
    // "1001.script.js", // Enum invalid identifier
    // "1003.script.js", "1007.script.js", // Objects in catch parameter
    // "1008.script.js", // Object in function parameter
    // "1012.script.js", // Object in for declaration
    // "1013.script.js", "1014.script.js", // Destructuring in let construct
    // "1019.script.js", // Class with empty statements
    // "1057.module.js", // import *
    // "1058.module.js", "1059.module.js", "1060.module.js", "1061.module.js", "1062.module.js", "1063.module.js", // export object from foo
];
let failExcludes = [];
let earlyExcludes = [];

fs.readdirSync(__dirname + '/../build/dependencies/test262-parser-tests/pass').filter(f => !passExcludes.includes(f)).forEach(f => {
    let firstTree, secondTree;
    try {
        firstTree = parse(
            fs.readFileSync(__dirname + `/../build/dependencies/test262-parser-tests/pass/${f}`, 'utf8')
        );
    } catch (e) {
        console.log("Failed test: pass/" + f);
    }
    try {
        secondTree = parse(
          fs.readFileSync(__dirname + `/../build/dependencies/test262-parser-tests/pass-explicit/${f}`, 'utf8')
        );
    } catch(e) {
        console.log("Failed test: pass-explicit/" + f);
    }
    if (firstTree !== secondTree) {
        console.log("Results for tests pass/" + f + " and pass-explicit/" + f + " don't match");
    }
});

fs.readdirSync(__dirname + '/../build/dependencies/test262-parser-tests/fail').filter(f => !failExcludes.includes(f)).forEach(f => {
  assert.throws(() => {
    parse(
      fs.readFileSync(__dirname + `/../build/dependencies/test262-parser-tests/fail/${f}`, 'utf8')
    );
}, "fail/" + f);
});

fs.readdirSync(__dirname + '/../build/dependencies/test262-parser-tests/early').filter(f => !earlyExcludes.includes(f)).forEach(f => {
  assert.doesNotThrow(() => {
    parse(
      fs.readFileSync(__dirname + `/../build/dependencies/test262-parser-tests/early/${f}`, 'utf8')
    );
}, "early/" + f);
  assert.throws(() => {
    parse(
      fs.readFileSync(__dirname + `/../build/dependencies/test262-parser-tests/early/${f}`, 'utf8')
    );
}, "early/" + f);
});