async function fetchImageVulnerabilitiesDataByLineageId(lineageId) {
    try {
        dataset = await execute_database_server_request(`
            with latest_image_id as (
                select id.image_id 
                from lineage_details ld 
                    join lineage_id_to_image_id iitli on iitli.lineage_id = ld.lineage_id 
                    join image_details id on iitli.image_id = id.image_id
                where ld.lineage_id='${lineageId}'
                order by id.committed_date desc
                limit 1
            )
            SELECT vr.cve_id, vr.severity 
            FROM image_details id 
                JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest 
                JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest 
                JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id 
            WHERE dtsr.report IS NOT NULL 
                AND id.image_id = (select image_id from latest_image_id)
        `);
        console.log("Fetched Data: ", { dataset });
        dataset = imageVulnerabilitiesDataPreprocessor(dataset);
        CreateImageVulnerabilitiesChart(dataset);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function fetchImageVulnerabilitiesDataByImageId(imageId) {
    try {
        dataset = await execute_database_server_request(`
            SELECT vr.cve_id, vr.severity 
            FROM image_details id 
                JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest 
                JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest 
                JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id 
            WHERE dtsr.report IS NOT NULL 
                AND id.image_id = '${imageId}'
        `);
        console.log("Fetched Data: ", { dataset });
        dataset = imageVulnerabilitiesDataPreprocessor(dataset);
        CreateImageVulnerabilitiesChart(dataset);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

// Use this function to do any preprocessing on returned data
function imageVulnerabilitiesDataPreprocessor(data) {
    const severityLevels = ["Low", "Medium", "High", "Critical", "Unknown"];
    const severityCounts = {};

    severityLevels.forEach(level => {
        severityCounts[level] = data.filter(d => d.severity === level).length;
    });

    // Convert counts to array for D3
    var dataset = severityLevels.map(level => ({
        severity: level,
        count: severityCounts[level]
    }));
    console.log("Processed Data: ", dataset)
    return dataset;
}

function CreateImageVulnerabilitiesChart(data) {
    // Get layout parameters
    var svgWidth = 600;
    var svgHeight = 450;
    var padding = {t: 40, r: 40, b: 40, l: 40};
    
    // Compute chart dimensions
    var chartWidth = svgWidth - padding.l - padding.r;
    var chartHeight = svgHeight - padding.t - padding.b;
    
    const svg = d3.select('#image-vulnerabilities-container > svg');
    svg.selectAll('*').remove();

    svg.attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;');

    // Create a group element for appending chart elements
    var chartG = svg.append('g')
        .attr('transform', 'translate('+[padding.l, padding.t]+')');

    // Create groups for the x- and y-axes
    var xScale = d3.scaleBand()
        .domain(data.map(d => d.severity))
        .range([0, chartWidth])
        .padding(0.6);

    var yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([chartHeight, 0]);

    chartG.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate('+[0, chartHeight]+')')
        .call(d3.axisBottom(xScale));
    chartG.append('g')
        .attr('class', 'y axis')
        .call(d3.axisLeft(yScale));

    // Coloring
    const severityColors = {
        Low: '#4CAF50',
        Medium: '#FFC107',
        High: '#FF5722',
        Critical: '#D32F2F',
        Unknown: '#9E9E9E'
    };

    chartG.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.severity))
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => chartHeight - yScale(d.count))
        .attr('fill', d => severityColors[d.severity]);
    
    // Labels
    chartG.selectAll('.bar-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.severity) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.count) - 5)
        .attr('fill', 'var(--content-color)')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(d => d.count);
    
    chartG.append('text')
        .attr('class', 'y axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -padding.l + 15)
        .attr('fill', 'var(--content-color)')
        .attr('text-anchor', 'middle')
        .attr('font-size', '24px')
        .text('Count');
}

window.addEventListener('lineageClicked', (event) => {
    console.log('image_vulnerabilities loading...', { event })
    fetchImageVulnerabilitiesDataByLineageId(event.detail.lineageId);
})