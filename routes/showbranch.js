// requirements
var express = require('express');
var router = express.Router();
var fs = require('fs');
var config = require('../config.json');
var logDir = config.coinsBuilderPath + '/log/show_branch';
var RSVP = require ('rsvp');
var url = require('url');
var refreshLogLock = false;

var promisify = function (asyncFn, params) {
    return new RSVP.Promise(function promisifyAsyncFn(resolve, reject) {
        var cb = function handleAsyncFn(err) {
            if (err !== null) {
                reject(err);
            } else {
                resolve(Array.prototype.slice.call(arguments, 1));
            }
        };
        params.push(cb);
        console.dir(params);
        return asyncFn.apply(null, params);
    });
};

RSVP.on('error', function(reason) {
    console.log(reason);
    console.assert(false, reason);
});

/* GET home page. */
router.get('/', function(req, res) {
    return promisify(fs.readdir, [logDir])
        .then(function getAllDirStats(dirs) {
            var statsPromises;
            console.dir(dirs);
            dirs = dirs[0];
            statsPromises = dirs.map(function getDirMTime(dirPath) {
                return promisify(fs.stat, [logDir + '/'+ dirPath])
                    .then(function getStatsMTime (stats) {
                        return { directory: dirPath, mtime: stats[0].mtime };
                    });
            });
            return RSVP.Promise.all(statsPromises);
        }).then(function sendResponse (dirsAndStats) {
            res.end(JSON.stringify(dirsAndStats));
        });
}); 

router.param('release', function (req, res, next, releaseDir) {
    fs.readdir(logDir, function(err, logDirs) {
        if (err) {
            next(err);
        } else if (logDirs.indexOf(releaseDir) !== -1) {
            req.releaseDir = releaseDir;
            next();
        } else {
            next(new Error('unknown release specified: ' + releaseDir));
        }
    });
});

router.get('/release/:release', function(req, res) {
    var parser = require('git-show-branch-parser');
    var releaseDir = logDir +  '/' + req.releaseDir;

    fs.readdir(releaseDir, function(err, logs) {
        var parsePromises = logs.map(function(log){return parser(releaseDir + '/' + log)});
        RSVP.Promise.all(parsePromises)
            .then(function(allParsedObjects) {
                var logData = logs.map(function(logName, index){
                    return {
                        repo: logName.match (/[^\/]*$/)[0],
                        diff: allParsedObjects[index]
                    }
                });
                var url_parts = url.parse(req.url, true);
                var query = url_parts.query;
                var cb = query.callback;
                res.end(JSON.stringify(logData));
            });
    });
});

router.get('/version', function(req, res) {
    var releaseMeta = require(process.cwd() + '/' + logDir + '/../../.releaseMeta.json');
    res.end(JSON.stringify(releaseMeta));
});

router.get('/refreshlog', function(req, res) {
    var exec = require('child_process').exec,
        cmd = config.logShowBranchCmd;
    return new RSVP.Promise(function promisifyExec(resolve, reject){
        var child;
        if (refreshLogLock) {
            resolve({
                error: null,
                output: "Log refresh already in progress"
            });
        } else {
            refreshLogLock = true;
            child = exec(
                config.logShowBranchCmd,
                {
                    cwd: config.coinsBuilderPath
                },
                function handleRefreshLogOutput(error, stdout, stderr) {
                    //remove the lock pointer
                    refreshLogLock = false;
                    if (error !== null) {
                        console.error(error);
                        console.error(stderr);
                        console.error(stdout);
                        reject(error||stdout + stderr);
                    } else {
                        resolve({ error: null, output: stdout.toString()});
                    }
                }
            );
        }
    }).catch(function catchErr(err) {
        return {
            error: err.toString(),
            output: err.toString()
        };
    }).then(function sendResponse(responseObj) {
        res.end(JSON.stringify(responseObj));
    });
});

module.exports = router;
