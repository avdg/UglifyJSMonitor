var childProcess = require("child_process");
var fs = require("fs");
var readline = require("readline");

var git = require("nodegit");
var verify = require("../lib/verify");

var settings = {
    repositories: {
        test262: {
            branch: undefined,
            path: "build/dependencies/test262",
            origin: "https://github.com/tc39/test262.git",
            repo: undefined
        },
        uglify: {
            branch: undefined,
            path: "build/dependencies/UglifyJS2",
            origin: "https://github.com/mishoo/UglifyJS2.git",
            repo: undefined
        },
        "test262-harness": {
            branch: undefined,
            path: "build/dependencies/test262-harness",
            origin: "https://github.com/bterlson/test262-harness.git",
            repo: undefined
        },
        "test262-harness-py": {
            branch: undefined,
            path: "build/dependencies/test262-harness-py",
            origin: "https://github.com/test262-utils/test262-harness-py.git",
            repo: undefined
        },
        "test262-parser-tests": {
            branch: undefined,
            path: "build/dependencies/test262-parser-tests",
            origin: "https://github.com/tc39/test262-parser-tests.git",
            repo: undefined
        }
    },
    test262: {
        args: "",
        logfile: "build/logs/default.log",
        runner: "node --harmony scripts/ecmaTester" // todo allow configuring commands
    },
    processor: {
        command: "node",
        args: ["scripts/ecmaTestProcessor", "--output={out}", "{log}"],
        output: "build/logs/output.md"
    },
    python: process.env.PYTHON,
    readline: true
};

function getReadline() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

var setupNpm = function(repoRef) {
    return function(cb, error) {
        var cmd = /^win/.test(process.platform) ? "npm.cmd" : "npm";
        var child = childProcess.spawn(cmd, ["install"], {
            env: process.env,
            cwd: repoRef.path
        });

        child.on("exit", function() {
            cb();
        });

        child.on("error", function(e) {
            console.log(e);
            process.exit();
        });
    };
};

function config(settings, cb) {
    if (typeof cb !== "function") {
        cb = function() {};
    }

    console.log("These actions are available:");
    console.log("");
    console.log("1) [fetch]                Fetch and merge dependencies to the freshest checkout");
    console.log("2) [test262]              Change branch for test262");
    console.log("3) [uglify]               Change branch for uglify");
    console.log("4) [runner]               Change runner command");
    console.log("5) [test262-harness]      Change branch for test262-harness");
    console.log("6) [test262-harness-py]   Change branch for test262-harness-py");
    console.log("7) [test262-parser-tests] Change branch for test262-parser-tests");
    console.log("");
    console.log("0) [exit]    Go back");
    console.log("");

    rl = getReadline();
    rl.question("Number or command or ctrl + c (to exit)\n", function(answer) {
        rl.close();
        console.log("");

        gotoMenu = function() {
            config(settings, cb);
        };

        switch(answer) {
            case "0":
            case "exit":
                preCheck(settings, cb);
                break;
            case "1":
            case "fetch":
                fetch(settings).then(gotoMenu);
                break;
            case "2":
            case "test262":
                changeBranch(settings.repositories.test262, gotoMenu);
                break;
            case "3":
            case "uglify":
                changeBranch(settings.repositories.uglify, gotoMenu);
                break;
            case "4":
            case "runner":
                console.log("Current runner set at:");
                console.log(settings.test262.runner);
                console.log("");
                rl = getReadline();
                rl.question("Number or command or ctrl + c (to exit)\n", function(answer) {
                    rl.close();
                    // TODO process answer
                    gotoMenu();
                });
                break; // TODO test
            case "5":
            case "test262-harness":
                changeBranch(settings.repositories["test262-harness"], gotoMenu);
                break;
            case "6":
            case "test262-harness-py":
                changeBranch(settings.repositories["test262-harness-py"], gotoMenu);
                break;
            case "7":
            case "test262-parser-tests":
                changeBranch(settings.repositories["test262-parser-tests"], gotoMenu);
                break;
            default:
                config(settings, cb);
        }
    });
}

function changeBranch(repoRef, cb) {
    var filter = "refs/remotes/origin/";
    var exception = ["refs/remotes/origin/HEAD"];
    var headFilter = "refs/heads/";
    var repo = repoRef.repo;

    repo.getReferenceNames(git.Reference.TYPE.LISTALL).then(function(refs) {
        var branches = [];
        var existingBranches = [];

        console.log("Branches for " + repo.workdir());

        for (var i = 0; i < refs.length; i++) {
            if (refs[i].substr(0, filter.length) !== filter) {
                if (refs[i].substr(0, headFilter.length) === headFilter) {
                    existingBranches.push(refs[i].substr(headFilter.length));
                }

                continue;
            }

            if (exception.indexOf(refs[i]) !== -1) {
                continue;
            }

            var branch = refs[i].substr(filter.length);
            branches.push(branch);
            console.log((repoRef.branch === branch ? ">": " ") + "* " + branch);
        }

        console.log("");

        rl = getReadline();
        rl.question("Type a branch to pick it, press enter to leave menu\n", function(answer) {
            rl.close();
            console.log("");

            if (answer.trim() === "") {
                cb();
                return;
            }

            if (branches.indexOf(answer) !== -1) {
                console.log("Checking out " + answer);

                if (existingBranches.indexOf(answer) !== -1) {
                    repo.checkoutBranch(answer, {}).then(cb, function(e) {
                        console.log(e);
                    });
                } else {
                    repo.getBranchCommit(filter + answer).then(function(commit) {
                        repo.createBranch(answer, commit, false).then(function() {
                            repo.checkoutBranch(answer, {}).then(cb, function(e) {
                                console.log(e);
                            });
                        }, function(e) {
                            console.log(e);
                        });
                    }, function(e) {
                        console.log(e);
                    });
                }

                return;

            } else {
                console.log("Branch not found");
                console.log("");
                changeBranch(repo, cb);
                return;
            }
        });
    });
}

function fetch(settings) {
    var fetchAndFastForward = function(repoObj) {
        return function(cbFetch) {
            repoObj.repo.fetch("origin", {}).then(function() {
                repoObj.repo.mergeBranches(repoObj.branch, "remotes/origin/" + repoObj.branch, undefined, git.Merge.PREFERENCE.FASTFORWARD_ONLY).then(function(oid) {
                    console.log("Done merging " + repoObj.path + " to " + oid);
                    cbFetch();
                }, function(e) {
                    console.log(repoObj.repo.workdir());
                    console.log(e);
                });
            }, function(e) {
                console.log(repoObj.repo.workdir());
                console.log(e);
            });
        };
    };
    return Promise.all([
        new Promise(fetchAndFastForward(settings.repositories.test262)),
        new Promise(fetchAndFastForward(settings.repositories.uglify)),
        new Promise(fetchAndFastForward(settings.repositories["test262-harness"])),
        new Promise(fetchAndFastForward(settings.repositories["test262-harness-py"])),
        new Promise(fetchAndFastForward(settings.repositories["test262-parser-tests"]))
    ]).then(function() {
        console.log("");
        return;
    });
}

function preCheck(settings, cb) {
    if (typeof cb !== "function") {
        cb = function() {};
    }

    var confirm = function() {
        if (settings.test262.logfile === "build/logs/default.log") {
            var date = new Date();
            settings.test262.logfile = "build/logs/" + (settings.repositories.uglify.branch || "uglify") +
                "." + date.getDate()  + "." + (date.getMonth() + 1) + "." + date.getFullYear() + ".log";
        }

        console.log("");
        console.log("Pre-run checklist: (press ctrl+c to abort program at any moment)");
        console.log("");
        console.log(" === Versions ===");
        console.log("Test262              | " + settings.repositories.test262.commit + " (" + settings.repositories.test262.branch + ")");
        console.log("UglifyJS             | " + settings.repositories.uglify.commit + " (" + settings.repositories.uglify.branch + ")");
        console.log("Test262-harness      | " + settings.repositories["test262-harness"].commit + " (" + settings.repositories["test262-harness"].branch + ")");
        console.log("Test262-harness-py   | " + settings.repositories["test262-harness-py"].commit + " (" + settings.repositories["test262-harness-py"].branch + ")");
        console.log("test262-parser-tests | " + settings.repositories["test262-parser-tests"].commit + " (" + settings.repositories["test262-parser-tests"].branch + ")");
        console.log("");
        console.log(" === Dependencies ===");
        console.log("Python | " + settings.python);
        console.log("");
        console.log(" === Test262 settings ===");
        console.log("Args       | " + settings.test262.args);
        console.log("Executing  | " + settings.test262.runner);
        console.log("Logfile    | " + settings.test262.logfile);
        console.log("Processing | " + settings.processor.command);
        console.log("");

        rl = getReadline();
        rl.question("Press enter to continue, 'config' to change settings or press ctrl + c to exit\n", function(answer) {
            rl.close();
            console.log("");

            if (answer === "config") {
                config(settings, cb);
            } else {
                cb();
            }
        });
    };

    var verifyPython = function(cb, error) {
        verify.python2(settings.python, function(e, result) {
            if (e) {
                return error(e);
            }

            settings.python = result.python;
            cb();
        });
    };

    var fetchRepoDataOrSetup = function(repoRef) {
        return function(cb, error) {
            var fetchData = function() {
                git.Repository.open(repoRef.path).then(function(repo) {
                    repoRef.repo = repo;
                    repo.getCurrentBranch().then(function(ref) {
                        repoRef.branch = ref.shorthand();
                        repo.getHeadCommit().then(function(commit) {
                            repoRef.commit = commit.sha().substr(0, 10);
                            repoRef.commit += " " + commit.date().toLocaleDateString();
                            repoRef.commit += " " + (commit.summary() || "").substr(0, 30);
                            cb();
                        });
                    });
                }, error);
            };
            fs.exists(repoRef.path + "/.git", function(result) {
                if (result) {
                    fetchData();
                } else {
                    git.Clone.clone(repoRef.origin, repoRef.path).then(fetchData);
                }
            });
        };
    };

    console.log("Checking for non-existing dependencies...")
    return Promise.all([
        new Promise(verifyPython),
        new Promise(fetchRepoDataOrSetup(settings.repositories.test262)),
        new Promise(fetchRepoDataOrSetup(settings.repositories.uglify)),
        new Promise(fetchRepoDataOrSetup(settings.repositories["test262-harness"])),
        new Promise(fetchRepoDataOrSetup(settings.repositories["test262-harness-py"])),
        new Promise(fetchRepoDataOrSetup(settings.repositories["test262-parser-tests"]))
    ]).then(function(cb) {
        console.log("Checking npm on dependencies...");
        Promise.all([
            new Promise(setupNpm(settings.repositories.uglify)),
            new Promise(setupNpm(settings.repositories["test262-harness"]))
        ]).then(cb)
    }, function() {
        console.log(e);
        process.exit();
    }).then(confirm);
}

function run(settings, cb) {
    var rl;
    var cache = "";

    var parameters = [
        settings.repositories["test262-harness-py"].path + "/src/test262.py",
        "--tests=" + settings.repositories.test262.path,
        "--command", settings.test262.runner,
        "--logname", settings.test262.logfile,
        settings.test262.args
    ];


    if (Array.isArray(settings.test262.args)) {
        parameters = parameters.join(settings.test262.args);
    } else {
        parameters.push(settings.test262.args);
    }

    var child = childProcess.spawn(settings.python, parameters,
        {
            env: process.env
        }
    );


    if (settings.readline && process.stdout.isTTY) {
        process.stdout.write('Loading tests!');
        child.stdout.on("data", function(data) {
            // Buffer cache is always 2 lines, in case the last line is incomplete
            cache += data;
            cache = cache.split(/\r?\n/);
            cache = cache.splice(cache.length - 2);

            process.stdout.cursorTo(0);
            process.stdout.write(cache[0].substr(0, process.stdout.columns - 1));
            process.stdout.clearLine(1);

            cache = cache.join("\n");
        });
    }

    child.on("exit", function() {
        if (settings.readline && process.stdout.isTTY) {
            process.stdout.write("\n");
        }

        cb();
    });
}

function processor(settings, cb) {
    var parameters = [];

    if (Array.isArray(settings.processor.args)) {
        parameters = parameters.concat(settings.processor.args);
    } else {
        parameters.push(settings.processor.args);
    }

    for (var i = 0; i < parameters.length; i++) {
        parameters[i] = parameters[i]
            .replace(/{log}/g, settings.test262.logfile)
            .replace(/{out}/g, settings.processor.output);
    }

    var child = childProcess.spawn(
        settings.processor.command,
        parameters,
        {
            env: process.env
        }
    );

    child.on("exit", function() {
        cb();
    });

    child.on("error", function(e) {
        console.log(e);
        process.exit();
    });
}

preCheck(settings, function() {
    run(settings, function() {
        processor(settings, function() {
            console.log("done");
        });
    });
});