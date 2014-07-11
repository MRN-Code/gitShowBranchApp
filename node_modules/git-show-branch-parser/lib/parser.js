/**
 *  gitShowBranchParser: a simple tool to parse the output of `git show-branch` into useful JSON
 */
var fs = require('fs');
var RSVP = require('rsvp');
var _ = require('underscore');

module.exports = (function () {
    var Promise = RSVP.Promise;
    // Add global RSVP error handler
    RSVP.on('error', function(reason) {
        console.assert(false, reason);
    });

    /**
     * Creates a branch object from a line of git show-branch output
     * @param {string} line A line of git show-branch output
     * @return {object} An object with the branch's label and latestCommit
     */
    var createBranchFromLine = function(line) {
        return {
            label: line.match(/\[([^\]]*)\]/)[1],
            latestCommit: line.match(/\] *(.*)/)[1]
        };
    };

    /**
     * Creates a commit object from a line of git show-branch output
     * @param {string} line A line of git show-branch output
     * @return {object} An object with the commit label, commitMessage and an
     *   an array of booleans indicating whether the commit is present in each branch.
     */
    var createCommitFromLine = function(line) {
        return {
            label: line.match(/\[([^\]]*)\]/)[1],
            commitMessage: line.match(/\] *(.*)/)[1],
            branches: line.slice(0, line.indexOf(' [')).split("")
                .map(function(letter){ return letter !== ' '; })
        };
    };

    /**
     * Wrap readFile in a promise
     * @param {string} path Path to the file to be read
     * @param {object} options readFile options object
     * @return {promise} A promise to be fulfilled with the result of the async file read
     */
    var readFilePromise = function (path, options) {
        return new Promise(function promiseifyReadFile (res, rej) {
            fs.readFile(
                path,
                options?options:{},
                function handleReadFile (err, data) {
                    if (err) {
                        rej(err);
                    } else {
                        res(data);
                    }
                }
            );
        });
    };

    /**
     * Parse git show-branch output into a JS object
     * @param {string} pathToOutput Path to the file to be parsed
     * @param {function} callback Optional callback function that accepts input
     * parameters: (error, results)
     * @return {promise} A promise to be fulfilled with the parsed object. This
     * object looks like this:
     *   {
     *      branches: [{label:'', latestCommit:''}, ...],
     *      commits: [{label:'', commitMessage:'', branches:[false, true, ...]}, ...] 
     *   }
     */
    return function (pathToOutput, callback) {
        return readFilePromise(pathToOutput)
            .then(function convertAndSplit (buffer) {
                return buffer.toString().split('\n');
            }).then(function separateBranchesFromCommits (lines) {
                return {
                    branchLines : lines.splice(0, lines.indexOf('---')),
                    commitLines : lines.splice(1).filter(function(line){return !line.match(/^ *$/);})
                };
            }).then(function processLines(splitLines) {
                return {
                    branches: splitLines.branchLines.map(createBranchFromLine),
                    commits: splitLines.commitLines.map(createCommitFromLine)
                };
            }).then ( function executeCallback (processedObj) {
                if (_.isFunction(callback)) {
                    callback(null, processedObj);
                }
                return processedObj;
            }).catch(function catchParseError (err) {
                if (_.isFunction(callback)) {
                    callback(err);
                } else {
                    // Re-throw error
                    throw err;
                }
            });
    };
})();



