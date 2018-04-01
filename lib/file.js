const fs = require("fs");
const path = require("path");

const mkdirBuilder = (mode) => (currentDirectory, nextDirectory) => {
    const newDirectory = currentDirectory + nextDirectory + '/';
    const subpath = path.resolve(newDirectory);

    if (!fs.existsSync(subpath)) {
        try {
            fs.mkdirSync(subpath, mode);
        } catch (e) {
            throw new Error(
                'Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').',
                e
            );
        }
    }

    return newDirectory;
}

// mkdir comes from file.mkdir on https://github.com/gruntjs/grunt
// Like mkdir -p. Create a directory and any intermediary directories.
const pathSeparatorRe = /[\/\\]/g;
const mkdir = (dirpath, mode) => {
    // Set directory mode in a strict-mode-friendly way.
    if (null === mode) {
        mode = parseInt('0777', 8) & (~process.umask());
    }

    dirpath.split(pathSeparatorRe).reduce(mkdirBuilder(mode), '');
};

module.exports = {
    mkdir
};
