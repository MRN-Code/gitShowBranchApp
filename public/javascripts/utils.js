(function() {
    var versionMeta = {};
    function convertToImage (bool) {
        if (bool) {
            return '<img src="images/check.png"></img>';
        } else {
            return '<img src="images/minus.png"></img>';
        }
    }

    function startLoading () {
        $('.loading-animation').addClass('la-animation').fadeIn(100);
        $('.loading-message').fadeIn(100);
    }
    function stopLoading () {
        $('.loading-animation').fadeOut(100, function(){$('.loading-animation').removeClass('la-animation');});
        $('.loading-message').fadeOut(100);
    }

    function getReleases() {
        $.getJSON('showbranch')
            .done(function (data) {
                var container = $('<div>');
                container.append('<h3>Select a release</h3>');
                container.append('<table cellpadding="0" cellspacing="0" border="0" class="cell-border hover"></table>');
                $('#content').html('').append(container);
                var dataTableConfig = {
                    bPaginate: false,
                    columns: [{title: "Next Release Version"}, {title: "Log Generation Date"}],
                    data: data.map(function buildLinks(release) {
                        return [
                            '<a href="#release/' + release.directory + '">' + release.directory + '</a>',
                            new Date(release.mtime).toString()
                        ];
                    })
                };
                container.children('table').dataTable(dataTableConfig);
            }).fail(function (err) {
                    $('#content').html('<h3 class="error">Error fetching releases</h3>');
                    console.assert(false, err);
            });
    }
    function getVersionInfo() {
        $.getJSON('showbranch/version')
            .done(function (data) {
                 var key, val, tmpEl, container;
                 var versionLabels = {
                     prodVersion: "production version",
                     releaseVersion: "next release version",
                     developVersion: "version under development"
                 };
                 versionMeta = data;
                 container = $('#version_container').empty();
                 for (var key in versionLabels) {
                     if (data.hasOwnProperty(key)) {
                         val = data[key];
                         tmpEl = jQuery('<div>');
                         tmpEl.append('<label>' + versionLabels[key] +'</label>');
                         tmpEl.append('<input disabled value="' + val +'" />');
                         container.append(tmpEl);
                     }
                 }
            });
    }
    function getBranchCommits (release) {
        var release;
        var branchLabels = {
            "origin/master": "Production",
            "origin/release": "Next Release",
            "origin/develop": "Under Development"
        };
        if(location.hash.match(/release\/.*/)) {
            release = location.hash.match(/release\/(.*)$/)[1];
            $.getJSON('showbranch/release/' + release)
                .done(function(data) {
                    $('#content').html('').append('<h1>Showing status just before releasing <em>' + release + '</em> to production</h1>');
                    data.forEach(function(repo){
                        repo.diff.commits = trimCommonCommits(repo.diff.commits);
                        var container = $('<div>');
                        container.append('<h3>' + repo.repo + '</h3>');
                        container.append('<table cellpadding="0" cellspacing="0" border="0" class="cell-border hover"></table>');
                        $('#content').append(container);
                        var dataTableConfig = {
                            columns: [{title: "Commit", width:"40%"}]
                                .concat(
                                    repo.diff.branches.map(
                                        function extractLabel (branch) {
                                            var branchName = branch.label;
                                            var releaseLabel = '';
                                            var branchLabel = '';
                                            if (branchName.match('release')) {
                                                if (release === 'current') {
                                                    releaseLabel = versionMeta.releaseVersion;
                                                } else {
                                                    releaseLabel = release;
                                                }
                                                branchLabel = branchLabels[branchName] + ' (' + releaseLabel + ')';
                                            } else {
                                                branchLabel = branchLabels[branchName];
                                            }
                                            return {title: branchLabel}
                                        }
                                    )
                                ),
                            data: repo.diff.commits.map(function buildRows(commit) {
                                return ['<a href="https://github.com/MRN-Code/' + repo.repo + '/commit/' + commit.label + '" target="_blank">[' + commit.label + ']</a> ' + linkCommitMessageToPR(repo.repo, commit.commitMessage)]
                                    .concat(commit.branches.map(convertToImage))
                                    .concat(commit.branches);
                            }),
                            columnDefs: [
                                {
                                    targets:[4,5,6],
                                    visible:false,
                                    searchable:false
                                },
                                {
                                    targets:[1],
                                    orderData:[4,5,6]
                                },
                                {
                                    targets:[2],
                                    orderData:[5,6]
                                },
                                {
                                    targets:[3],
                                    orderData:[6]
                                }
                            ],
                            order:[[4,'asc'],[5,'asc'],[6,'asc']]
                        };
                        container.children('table').dataTable(dataTableConfig);
                    });
                    filterPulls();
                }).fail(function (err) {
                    $('#content').html('<h3 class="error">Error fetching release logs</h3>');
                    console.assert(false, err);
                });
         } else {
            getReleases();
         }
     }
     function filterPulls () {
         var searchStr = '';
         if ($('#filter_pulls:checked').length) {
             searchStr = 'pull';
         }
         $('table').each(function(){$(this).DataTable().search(searchStr).draw()})
     }
     function refreshLogs () {
        var url = 'showbranch/refreshlog',
            defaultLoadingMsg,
            defaultRefreshLogMsg,
            self = this;
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            beforeSend: function () {
                defaultRefreshLogMsg = $('#refresh_log').html();
                $('#refresh_log').addClass('deactivated').html('Refreshing').off();
                defaultLoadingMsg = $('.loading-message').html();
                $('.loading-message').html('Refreshing Logs. This may take a while...');
            }
        })
            .done(function(data) {
                var completionMsg = '';
                $('.loading-message').html(defaultLoadingMsg);
                $('#refresh_log').removeClass('deactivated').html(defaultRefreshLogMsg).on('click', refreshLogs);
                if(data.error) {
                    $('#refresh_log').html(data.error).prop('title', data.output);
                    completionMsg = 'Error: ' + data.error + ': <br>' + data.output;
                } else if (data.output === 'Log refresh already in progress') {
                    completionMsg = 'Log refresh already in progress. Try again in 30 seconds';
                }else {
                    completionMsg = 'Logs refreshed successfully';
                    getBranchCommits();
                }
                $('#refresh_log_message').html(completionMsg).show(function(){$(this).delay(3000).fadeOut();});
            });
     }
     function generatePullRequestURL(repoName, pullRequestNumber) {
         var urlSeed = 'https://github.com/MRN-Code/';
         return urlSeed + repoName + '/pull/' + pullRequestNumber;
     }
     function extractPullRequestNumber(commitMessage) {
         var pullRequestNumber;
         if (commitMessage.match('pull request #')) {
             pullRequestNumber = commitMessage.match(/pull request #(\d+)/)[1];
             return pullRequestNumber;
         }
         return null;
     }
     function linkCommitMessageToPR(repoName, commitMessage) {
         var pullRequestNumber, pullRequestURL, anchorHTML;
         if (commitMessage.match('pull request #')) {
             pullRequestNumber = extractPullRequestNumber(commitMessage);
             pullRequestURL = generatePullRequestURL(repoName, pullRequestNumber);
             anchorHTML = '<a target="_blank" href="' + pullRequestURL + '">#' + pullRequestNumber + '</a>';
             return commitMessage.replace('#' + pullRequestNumber, anchorHTML);
         }
         return commitMessage;
     }
     function trimCommonCommits(commits) {
         var splitFound = false;
         return commits.reverse()
             .filter(function findFirstUncommonCommit(commit, index) {
                 if (!commit.branches.every(_.identity)) { //true if commit is not shared across all branches
                     splitFound = true;
                 }
                 return splitFound;
             })
             .reverse();
     }

     $(document).ajaxStart(startLoading);
     $(document).ajaxStop(stopLoading);
     window.addEventListener('hashchange',function () {
         getVersionInfo();
         getBranchCommits();
     });

     $(document).ready(function() {
        $('#refresh_log').on('click', refreshLogs);
        $('#filter_pulls').on('change', filterPulls);
        getVersionInfo();
        getBranchCommits();
     });
})();
