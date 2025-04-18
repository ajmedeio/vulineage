fetchData();
async function fetchData() {
    try {
        const response = await fetch("https://database.vulineage.com", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "query": "SELECT Id.committed_date, vr.cve_id, vr.severity FROM lineage_details ld JOIN lineage_id_to_image_id iil ON ld.lineage_id = iil.lineage_id JOIN image_details id ON iil.image_id = id.image_id JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id WHERE ld.lineage_id = 5110799188545663389 and dtsr.report IS NOT NULL ORDER BY id.committed_date"
            })
        });

        dataset = await response.json();
        console.log("Fetched Data: ", dataset);
        dataset = dataPreprocessor(dataset);
        CreateChart(dataset);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

// Use this function to do any preprocessing on returned data
function dataPreprocessor(data) {
    const severityLevels = ["Low", "Medium", "High", "Critical", "Unknown"];
    const grouped = {};

    data.forEach(d => {
        const date = new Date(d.committed_date * 1000).toDateString(); // Unix date
        const severity = d.severity;

        if (!grouped[date]) {
            grouped[date] = {};
        }
        if (!grouped[date][severity]) {
            grouped[date][severity] = 0;
        }
        grouped[date][severity]++;
    });

    const dataset = severityLevels.map(severity => {
        const values = Object.keys(grouped).map(date => {
            return {
                date: new Date(date),
                count: grouped[date][severity] || 0
            };
        }).sort((a, b) => a.date - b.date);

        return {
            severity: severity,
            values: values
        };
    });

    console.log("Processed Data: ", dataset);
    return dataset;
}

function CreateChart(data) {
    var svg = d3.select('svg');

    // Get layout parameters
    var svgWidth = +svg.attr('width');
    var svgHeight = +svg.attr('height');
    var padding = {t: 40, r: 40, b: 40, l: 40};

    // Compute chart dimensions
    var chartWidth = svgWidth - padding.l - padding.r;
    var chartHeight = svgHeight - padding.t - padding.b;

    // Create a group element for appending chart elements
    var chartG = svg.append('g')
        .attr('transform', 'translate('+[padding.l, padding.t]+')');

    // Create groups for the x- and y-axes
    const allPoints = data.flatMap(d => d.values);
    var xScale = d3.scaleTime()
        .domain(d3.extent(allPoints, d => d.date))
        .range([0, chartWidth]);

    var yScale = d3.scaleLinear()
        .domain([0, d3.max(allPoints, d => d.count)])
        .range([chartHeight, 0]);

    chartG.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate('+[0, chartHeight]+')')
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %d')));
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

    // Line generator
    var line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.count));

    data.forEach(severityGroup => {
        // Draw the line
        chartG.append('path')
            .datum(severityGroup.values)
            .attr('fill', 'none')
            .attr('stroke', severityColors[severityGroup.severity])
            .attr('stroke-width', 2)
            .attr('d', line);

        // Add labels at end of line
        const last = severityGroup.values[severityGroup.values.length - 1];
        chartG.append('text')
            .attr('x', xScale(last.date) + 5)
            .attr('y', yScale(last.count))
            .text(severityGroup.severity)
            .attr('fill', severityColors[severityGroup.severity])
            .attr('font-size', '12px')
            .attr('alignment-baseline', 'middle');
    });
    
    chartG.append('text')
        .attr('class', 'y axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -padding.l + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#000')
        .attr('font-size', '24px')
        .text('Count');
}
