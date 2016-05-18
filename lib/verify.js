var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

// Python checker from https://github.com/atom/atom/blob/f48069c5f848b5ae624b110a1df7800e919eb142/script/utils/verify-requirements.js
function verifyPython2(pythonExecutable, cb) {
  if (process.platform == 'win32') {
    if (!pythonExecutable) {
      var systemDrive = process.env.SystemDrive || 'C:\\';
      pythonExecutable = path.join(systemDrive, 'Python27', 'python.exe');

      if (!fs.existsSync(pythonExecutable)) {
        pythonExecutable = 'python';
      }
    }

    checkPythonVersion(pythonExecutable, cb);
  }
  else {
    cb(null, '');
  }
}

function checkPythonVersion (python, cb) {
  var pythonHelpMessage = "Set the PYTHON env var to '/path/to/Python27/python.exe' if your python is installed in a non-default location.";

  childProcess.execFile(python, ['-c', 'import platform; print(platform.python_version());'], { env: process.env }, function (err, stdout) {
    if (err) {
      error = "Python 2.7 is required to run test262. An error (" + err + ") occured when checking the version of '" + python + "'. ";
      error += pythonHelpMessage;
      cb(error);
      return;
    }

    var version = stdout.trim();
    if (~version.indexOf('+')) {
      version = version.replace(/\+/g, '');
    }
    if (~version.indexOf('rc')) {
      version = version.replace(/rc(.*)$/ig, '');
    }

    // Test262 requires python 2.0 or higher (but not python 3)
    var versionArray = version.split('.').map(function(num) { return +num; });
    var goodPythonVersion = (versionArray[0] === 2 && versionArray[1] >= 0);
    if (!goodPythonVersion) {
      error = "Python 2.7 is required to build Atom. '" + python + "' returns version " + version + ". ";
      error += pythonHelpMessage;
      cb(error);
      return;
    }

    // Finally, if we've gotten this far, callback to resume the install process.
    cb(null, {version: version, python: python});
  });
}

module.exports = {
    python2: verifyPython2
};