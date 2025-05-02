(async () => {
    // Fetch the list of repositories
    const query = `
        SELECT DISTINCT ld.repository
        FROM lineage_details ld
        WHERE ld.platform = 'linux' AND ld.architecture = 'amd64'
        ORDER BY ld.repository ASC
    `;
    const repositoriesPromise = execute_database_server_request(query);

    // Select the container for the multiselect
    const container = d3.select('#repository-select-container');

    // Add a label
    // container.append('label')
    //     .attr('for', 'repository-select')
    //     .text('Select a repository:');

    // Create a single-select dropdown
    container.append('select')
        .attr('id', 'repository-select')
        .attr('name', 'repository-select')
        .style('width', '260px')
        .style('margin', '10px');

    const repositories = await repositoriesPromise;
    
    const select = d3.select('#repository-select');
    select.selectAll('option')
        .data(repositories)
        .enter()
        .append('option')
        .attr('value', d => d.repository)
        .text(d => d.repository);

    // Initialize SlimSelect AFTER populating options
    new SlimSelect({
        select: '#repository-select',
        placeholder: 'Select a repository'
    });

    // Add an event listener
    select.on('change', function (event) {
        const selectedOption = this.value;
        window.dispatchEvent(new CustomEvent('repositorySelected', {
            detail: [selectedOption]
        }));
    });
})();
