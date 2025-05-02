let slimTagSelect =   null;

initTagSelect();

async function initTagSelect() {
    const container = d3.select('#tag-select-container');
    // container.append('label')
    //     .attr('for', 'tag-select')
    //     .text('Select a tag:');
     

    container.append('select')
        .attr('id', 'tag-select')
        .attr('name', 'tag-select')
        .style('min-width', '260px')
        .style('width', '260px')
        .style('margin', '10px');



    // Initialize SlimSelect on #tag-select
    slimTagSelect = new SlimSelect({
        select: '#tag-select',
        
        settings: {
            placeholderText: 'Select a tag...',
            showSearch: false, // disables search bar
        }
    });


}
async function refreshTagSelect(repository) {
    const query = `
        SELECT ld.lineage_id, ld.repository, ld.architecture, ld.platform, ld.tags
        FROM lineage_details ld
        WHERE ld.repository = '${repository}'
        AND ld.platform = 'linux'
        AND ld.architecture = 'amd64'
        AND ld.parents = '[]'
        ORDER BY ld.tags ASC
    `;
    console.log('Fetching root lineages...');
    const rootLineages = await execute_database_server_request(query);
    console.log('Fetched root lineages.');

    const tags = new Map();
    rootLineages.forEach(lineage => {
        if (typeof lineage.tags === "string") {
            lineage.tags = JSON.parse(lineage.tags.replace(/'/g, '"'));
        }
        lineage.tags.forEach(tag => {
            tag.lineage = lineage;
            tags.set(tag, lineage);
        });
    });

    // 👉 Build options array: add placeholder manually
    const options = [
        { text: 'Select a tag...', value: '', placeholder: true },
        ...Array.from(tags.entries()).map(([tag, lineage]) => ({
            text: tag,
            value: lineage.lineage_id
        }))
    ];

// Update SlimSelect options
slimTagSelect.setData(options);

// Clear the selection correctly
slimTagSelect.setSelected([]);

    // 👉 Handle selection manually
    const selectElement = document.getElementById('tag-select');
    selectElement.onchange = function (event) {
        const selectedLineageId = event.target.value;
        if (selectedLineageId) { // Only trigger if user selected something real
            window.dispatchEvent(new CustomEvent('tagSelected', {
                detail: selectedLineageId
            }));
        }
    };
}


window.addEventListener('repositorySelected', function (event) {
    const selectedRepositories = event.detail;
    console.log("repositorySelected", { event, selectedRepositories });
    refreshTagSelect(selectedRepositories[0]);
});

document.getElementById("darkModeToggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark-mode");
  });