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
                "query": "SELECT ld.*, iil.image_id, id.committed_date FROM lineage_details ld JOIN lineage_id_to_image_id  iil ON ld.lineage_id = iil.lineage_id JOIN image_details id ON iil.image_id = id.image_id WHERE ld.lineage_id = -1000033263475935320 ORDER BY id.committed_date"
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
            'name': data['name'],
            'economy (mpg)': data['economy (mpg)'],
        }
        dataset.append(row)
    }
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
        .attr('transform', 'translate('+[0, chartHeight]+')');
    var yAxisG = chartG.append('g')
        .attr('class', 'y axis');
    var xScale = d3.scaleLinear().range([0, chartWidth]).domain();
    var yScale = d3.scaleLinear().range([chartHeight, 0]).domain();

    xAxisG.transition()
            .duration(750)
            .call(d3.axisBottom(xScale));

    yAxisG.transition()
            .duration(750)
            .call(d3.axisLeft(yScale));

    var dots = chartG.selectAll('.dot').data(dataset);

    var dotsEnter = dots.enter()
                    .append('g')
                    .attr('class', 'dot');

    dotsEnter.append('circle').attr('r', 3)
    dotsEnter.append('text')
            .attr('y', -10)
            .text(function(d) {
                return d.name;
            });

    dots.merge(dotsEnter)
        .transition()
        .duration(750)
        .attr('transform', function(d) {
            var tx = xScale(d[chartScales.x]);
            var ty = yScale(d[chartScales.y]);
            return 'translate('+[tx, ty]+')';
        });
}
