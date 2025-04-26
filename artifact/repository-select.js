(async () => {
    // Fetch the list of repositories
    const query = `
        SELECT DISTINCT ld.repository
        FROM lineage_details ld
        WHERE ld.platform = 'linux' AND ld.architecture = 'amd64'
        order by ld.last_instance_commit_date desc
    `;
    const repositories = await execute_database_server_request(query);
    console.log('Fetched Repositories:', repositories);

    // Select the container for the multiselect
    const container = d3.select('#repository-select-container');

    // Add a label
    container.append('label')
        .attr('for', 'repository-select')
        .text('Select a repository:');

    // Create a multiselect dropdown
    const select = container.append('select')
        .style('display', 'block')
        .attr('id', 'repository-select')
        .attr('name', 'repository-select')
        .attr('multiple', true)
        .style('width', '260px')
        .style('height', '200px');

    // Populate the dropdown with repository options
    select.selectAll('option')
        .data(repositories)
        .enter()
        .append('option')
        .attr('value', d => d.repository)
        .text(d => d.repository);

    // Add an event listener to handle selection changes
    select.on('change', function (event) {
        const selectedOptions = Array.from(this.selectedOptions).map(option => option.value);
        console.log('Selected Repositories:', selectedOptions);
        console.log('Event:', event);
        window.dispatchEvent(new CustomEvent('repositorySelected', {
            detail: selectedOptions
        }));
    });
})();