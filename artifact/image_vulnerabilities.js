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
                "query": "SELECT id.*, dtsr.report, dtv.vulnerability_id, vr.* FROM image_details id JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id WHERE dtsr.report IS NOT NULL AND id.image_id = 'sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed'"
            })
        });

        dataset = await response.json();
        console.log("Fetched Data:", dataset);
        dataset = dataPreprocessor(dataset);
        CreateChart(dataset);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

// Use this function to do any preprocessing on returned data
function dataPreprocessor(data) {
    dataset = []
    for(let i=0; i<data.length; i++) {
        row = {
            'cve_id': data['cve_id'],
            'serverity': data['serverity'],
        }
        dataset.push(row)
    }
    return dataset;
}

function CreateChart(dataset) {
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
    var xAxisG = chartG.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate('+[0, chartHeight]+')')
        .call(d3.axisBottom());
    var yAxisG = chartG.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate('+[90, chartWidth]+')')
        .call(d3.axisLeft());

}
