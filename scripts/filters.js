module.exports = {
    onlyUglifyFailures: function(text) {
        return text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \(Caused by UglifyJS\))/g)
            .map(function(r, i, a) {
                return r.substr("https://github.com/tc39/test262/blob/master/test/".length);
            })
            .reduce(function(a, b) {
                return a + "\n" + b;
            });
    },
    nodeAndUglifyFailures: function(text) {
        return text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \(Caused by Node and by UglifyJS\))/g)
            .map(function(r, i, a) {
                return r.substr("https://github.com/tc39/test262/blob/master/test/".length);
            }).reduce(function(a, b) {
                return a + "\n" + b;
            });
    },
    unknownFailures: function(text) {
        return text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \-)/g)
            .map(function(r, i, a) {
                return r.substr("https://github.com/tc39/test262/blob/master/test/".length);
            }).reduce(function(a, b) {
                return a + "\n" + b;
            });
    }
};