'use strict';

const getErrorContent = (rawErrorList) =>
    rawErrorList.map(
        (r) => r.substr("https://github.com/tc39/test262/blob/master/test/".length)
    ).reduce(
        (a, b) => a + '\n' + b
    );

module.exports = {
    onlyUglifyFailures: (text) => getErrorContent(
        text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \(Caused by UglifyJS\))/g)
    ),
    nodeAndUglifyFailures: (text) => getErrorContent(
        text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \(Caused by Node and by UglifyJS\))/g)
    ),
    unknownFailures: (text) => getErrorContent(
        text.match(/https:\/\/[a-zA-Z0-9\/\-._]+(?=\) \-)/g)
    ),
};
