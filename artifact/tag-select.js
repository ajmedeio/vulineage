initTagSelect();
async function initTagSelect() {
    const container = d3.select('#tag-select-container');
    container.append('label')
        .attr('for', 'tag-select')
        .text('Select a tag:');

    // Create a multiselect dropdown
    container.append('select')
        .attr("id", 'tag-select')
        .attr('multiple', true)
        .style('minWidth', '260px')
        .style('width', '260px')
        .style('display', 'block')
        .style('height', '100px');
}

async function refreshTagSelect(repository) {
    // Given a repository, architecture, and platform, fetch the corresponding root lineage
    // where a root lineage is defined as a lineage with no parent lineage.
    const query = `
        SELECT ld.lineage_id, ld.repository, ld.architecture, ld.platform, ld.tags
        FROM lineage_details ld
        WHERE ld.repository = '${repository}'
        AND ld.platform = 'linux'
        AND ld.architecture = 'amd64'
        AND ld.parents = '[]'
        ORDER BY ld.last_instance_commit_date DESC
    `;
    console.log('Fetching root lineages...');
    const rootLineages = await execute_database_server_request(query);
    console.log('Fetched root lineages.');
    tags = new Map();
    rootLineages.forEach(lineage => {
        if (typeof lineage.tags === "string") {
            lineage.tags = JSON.parse(lineage.tags.replace(/'/g, '"'));
        }
        lineage.tags.forEach(tag => {
            tag.lineage = lineage
            tags.set(tag, lineage);
        });
    });

    const tagSelect = d3.select('#tag-select');
    tagSelect.selectAll('option').remove(); // Clear previous options
    tagSelect.selectAll('option')
        .data(tags, function(d) { return d[0] })
        .enter()
        .append('option')
        .attr('value', function(d) { return d[1] })
        .text(function(d) { return d[0] });
    tagSelect.on('change', function (event) {
        const selectedOptions = Array.from(this.selectedOptions);
        selectedLineageId = selectedOptions[0].__data__[1].lineage_id
        window.dispatchEvent(new CustomEvent('tagSelected', {
            detail: selectedLineageId
        }));
    });
}

window.addEventListener('repositorySelected', function(event) {
    const selectedRepositories = event.detail;
    console.log("repositorySelected", { event, selectedRepositories })
    refreshTagSelect(selectedRepositories[0]);
});