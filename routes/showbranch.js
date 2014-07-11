var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    var url = require('url');
    var parser = require('git-show-branch-parser');
    var fs = require('fs');
    var RSVP = require ('rsvp');
    var logDir = '../coins_builder/log/show_branch/current';

    RSVP.on('error', function(reason) {
        console.assert(false, reason);
    });

    fs.readdir(logDir, function(err, logs) {
        var parsePromises = logs.map(function(log){return parser(logDir + '/' + log)});
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
                res.end(cb + '(' + JSON.stringify(logData) + ')');
            });
    });
});

module.exports = router;
