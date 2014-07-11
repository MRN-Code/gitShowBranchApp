gitShowBranchParser
===================

Parse output of `git show-branch` command into JS object. 

Show-branch prints a unique tabular format that indicates which recent
are present in all of your branches. This output has been optimized for
reading on the command line, and does not adapt well if you want to
display this information on a web page, or use it in an application. 
**git-show-branch-parser** will parse the output into a more usable
javascript object.

## Usage
### Install
```shell
npm install git-show-branch-parser
```

### Require
```js
var showBranchParser = require('git-show-branch-parser');
```

### Parse!
```js
showBranchParser('path/to/show-branch/output.txt', function (err, obj) {
    console.log(JSON.stringify(obj, null, 4));
});
```
### Or use promises:
This function returns an RSVP promise.
```js
var sbpPromise = showBranchParser('path/to/show-branch/output.txt');
sbpPromise.then(function (obj) {
    console.log(JSON.stringify(obj, null, 4));
}).catch(function (err) {
    console.assert(false, err);
});
```

## Object Structure:
The `git show-branch` output is parsed into an object of the following form:
```
{
    branches: [
        {
            label: '...',
            latestCommit: '...'
        },
        ...
    ],
    commits: [
        {
            label: '...',
            commitMessage: '...',
            branches: // order mimics that of the branches array above
                [
                    boolean, // true if commit is in corresponding branch
                    boolean, // true if commit is in corresponding branch
                    ...
                ]
        },
        ...
    ]
}
```

## Details
For details about how to use `git show-branch`, refer to the documentation: 
https://www.kernel.org/pub/software/scm/git/docs/git-show-branch.html

Suppose that we have three branches used in our build/release cycle:
**master**, **release**, and **develop**. Before creating a release, it would
be useful to see which commits are in develop, but not in the release branch. 
Similarly, before pushing the release to master, it would be useful to document
which commits are going to me merged from master into release. 

The command `git show-branch` is very useful for this. By running `git show-branch origin/master,
origin/release, origin/develop`, we will get the following example output:
```
! [origin/master] update calendars on MICIS > REPORTS tab so that the sql queries will include the day specified.  This updates Billing Reports, Subject Enrollment, URSI Stats
 ! [origin/release] update asmt ref to develop from autoq
  ! [origin/develop] update asmt ref to develop from autoq
---
  + [12679ba] update asmt ref to develop from autoq
  - [36eb3f4] Merge pull request #90 from MRN-Code/auto_queue
 ++ [caf7e93] update asmt checksum.  Also, ORDER study list by study names, update wording in a message to user for readability, and remove extra onPageLoad function that was not being called, but if so, would create errors
 ++ [e5073e4] update error message function names
 ++ [cf62f75] added check for loginid on subj details
--- [fc5b144] Merge branch 'auto_queue' of github.com:MRN-Code/micis into auto_queue
```

The above output indicates that the first two commits are only present in **origin/develop**.
The next three commits are present in both **origin/develop**, and **orign/release**, and the
last commit is present in all three branches. 

By writing the output from `git show-branch`, we can later parse it into a JavaScript object
using this utility:
```js
var showBranchParser = require('git-show-branch-parser');
showBranchParser('path/to/show-branch/output.txt', function (err, obj) {
    console.log(JSON.stringify(obj, null, 4));
});
```

The above code will print the following:

```json
{
    "branches": [
        {
            "label": "origin/master",
            "latestCommit": "update calendars on MICIS > REPORTS tab so that the sql queries will include the day specified.  This updates Billing Reports, Subject Enrollment, URSI Stats"
        },
        {
            "label": "origin/release",
            "latestCommit": "update asmt ref to develop from autoq"
        },
        {
            "label": "origin/develop",
            "latestCommit": "update asmt ref to develop from autoq"
        }
    ],
    "commits": [
        {
            "label": "12679ba",
            "commitMessage": "update asmt ref to develop from autoq",
            "branches": [
                false,
                true,
                true
            ]
        },
        {
            "label": "36eb3f4",
            "commitMessage": "Merge pull request #90 from MRN-Code/auto_queue",
            "branches": [
                false,
                true,
                true
            ]
        },
        {
            "label": "caf7e93",
            "commitMessage": "update asmt checksum.  Also, ORDER study list by study names, update wording in a message to user for readability, and remove extra onPageLoad function that was not being called, but if so, would create errors",
            "branches": [
                false,
                true,
                true
            ]
        },
        {
            "label": "e5073e4",
            "commitMessage": "update error message function names",
            "branches": [
                false,
                true,
                true
            ]
        },
        {
            "label": "cf62f75",
            "commitMessage": "added check for loginid on subj details",
            "branches": [
                false,
                true,
                true
            ]
        },
        {
            "label": "fc5b144",
            "commitMessage": "Merge branch 'auto_queue' of github.com:MRN-Code/micis into auto_queue",
            "branches": [
                false,
                true,
                true
            ]
        }
    ]
}
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint your code using [Grunt](http://gruntjs.com/).

## TODO
1. Add unit testing
2. Differentiate between merge and normal commits

