// requirements
var express = require('express');
var router = express.Router();
var fs = require('fs');
var config = require('../config.json');
var logDir = config.coinsBuilderPath + '/log/show_branch';
var RSVP = require ('rsvp');
var url = require('url');
var refreshLogLock = false;

RSVP.on('error', function(reason) {
    console.log(reason);
    console.assert(false, reason);
});

/* GET home page. */
router.get('/', function(req, res) {
    fs.readdir(logDir, function(err, logDirs) {
        console.log(JSON.stringify(logDirs));
        res.end(JSON.stringify(logDirs));
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
                        reject(error);
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
