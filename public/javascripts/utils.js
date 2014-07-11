(function() {
    function convertToImage (bool) {
        if (bool) {
            return '<img src="images/check.png"></img>';
        } else {
            return '<img src="images/clock.png"></img>';
        }
    }

    function getBranchCommits () {
        $.getJSON('showbranch?callback=?', function(data) {
            data.forEach(function(repo){
                var container = $('<div>');
                container.append('<h3>' + repo.repo + '</h3>');
                container.append('<table cellpadding="0" cellspacing="0" border="0" class="cell-border hover"></table>');
                $('body').append(container);
                var dataTableConfig = {
                    columns: [{title: "Commit", width:"40%"}]
                        .concat(
                            repo.diff.branches.map(
                                function extractLabel (branch) {
                                    return {title: branch.label};
                                }
                            )
                        ),
                    data: repo.diff.commits.map(function buildRows(commit) {
                        return ['<a href="https://github.com/MRN-Code/' + repo.repo + '/commit/' + commit.label + '" target="_blank">[' + commit.label + ']</a> ' + commit.commitMessage].concat(commit.branches.map(convertToImage));
                    })
                };
                container.children('table').dataTable(dataTableConfig);
            });
            $('.loading-animation').fadeOut(function(){$('.loading-animation').removeClass('la-animation');});
            $('.loading-message').hide();
        });
     };

     $(document).ready(getBranchCommits);
})();
