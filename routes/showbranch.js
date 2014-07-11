// requirements
var express = require('express');
var router = express.Router();
var fs = require('fs');
var logDir = '../coins_builder/log/show_branch';
var RSVP = require ('rsvp');
var url = require('url');

/* GET home page. */
router.get('/', function(req, res) {
    fs.readdir(logDir, function(err, logDirs) {
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

    RSVP.on('error', function(reason) {
        console.assert(false, reason);
    });

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

module.exports = router;
