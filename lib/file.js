var fs = require("fs");
var path = require("path");

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

module.exports = {
    mkdir: mkdir
}