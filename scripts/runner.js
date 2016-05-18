var childProcess = require("child_process");
var readline = require("readline");

var git = require("nodegit");
var verify = require("../lib/verify");

var settings = {
    repositories: {
        test262: {
            path: "./build/dependencies/test262"
        },
        uglify: {
            path: "./build/dependencies/UglifyJS2"
        }
    },
    test262: {
        args: "",
        logfile: "build/logs/default.log",
        runner: "node scripts/ecmaTester"
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

function preCheck(settings, cb) {
    if (typeof cb !== "function") {
        cb = function() {};
    }

    var confirm = function() {
        if (settings.test262.logfile === "build/logs/default.log") {
            var date = new Date();
            settings.test262.logfile = "build/logs/" + (settings.repositories.uglify.branch || "uglify") +
                "." + date.getDay()  + "." + date.getMonth() + "." + date.getFullYear() + ".log";
        }

        console.log("Pre-run checklist: (press ctrl+c to abort program at any moment)");
        console.log("");
        console.log(" === Versions ===");
        console.log("Test262  | " + settings.repositories.test262.commit + " (" + settings.repositories.test262.branch + ")");
        console.log("UglifyJS | " + settings.repositories.uglify.commit + " (" + settings.repositories.uglify.branch + ")");
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
        rl.question("Press enter to confirm (or press ctrl + c)\n", function(answer) {
            cb();
            rl.close();
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

    var fetchRepoData = function(repoRef) {
        return function(cb, error) {
            git.Repository.open(repoRef.path).then(function(repo) {
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
    };

    Promise.all([
        new Promise(verifyPython),
        new Promise(fetchRepoData(settings.repositories.test262)),
        new Promise(fetchRepoData(settings.repositories.uglify))
    ]).then(function(result) {
        confirm();
    }, function(e) {
        console.log(e);
        process.exit();
    });
}

function run(settings, cb) {
    var rl;
    var cache = "";

    var parameters = [
        settings.repositories.test262.path + "/tools/packaging/test262.py",
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


    if (settings.readline) {
        rl = getReadline();
        rl.write('Loading tests!');
        child.stdout.on("data", function(data) {
            // Buffer cache is always 2 lines, in case the last line is incomplete
            cache += data;
            cache = cache.split(/\r?\n/);
            cache = cache.splice(0, cache.length - 2);

            rl.write(null, {ctrl: true, name: 'u'});
            rl.write(cache[0].substr(0, 80));

            cache = cache.join("\n");
        });
    }

    child.on("exit", function() {
        if (rl) {
            rl.close();
            console.log("\n");
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