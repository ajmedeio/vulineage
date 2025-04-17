var svg = d3.select('svg');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height');
var padding = {t: 40, r: 40, b: 40, l: 40};

// Compute chart dimensions
var width = svgWidth - padding.l - padding.r;
var height = svgHeight - padding.t - padding.b;

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
                "query": "--MUCH NEEDED--"
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
// Need the data to look something like this 
// id ~ lineage_id / image_id
// group = 0 if lineage_id
// group = 1 if image_id so we can later color them
/*
{
"nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1},
    ...
    ],
"links": [
    {"source": "Napoleon", "target": "Myriel", "value": 1},
    {"source": "Mlle.Baptistine", "target": "Myriel", "value": 8},
    ...
    ]
}
*/

    console.log("Processed Data: ", dataset);
    return dataset;
}

function CreateChart(network) {
    linkScale.domain(d3.extent(network.links, function(d){ return d.value;}));

    var linkG = svg.append('g')
        .attr('class', 'links-group');

    var nodeG = svg.append('g')
        .attr('class', 'nodes-group');

    var linkEnter = linkG.selectAll('.link')
        .data(network.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', function(d) {
            return linkScale(d.value);
        });
    
    var nodeEnter = nodeG.selectAll('.node')
        .data(network.nodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', 6)
        .style('fill', function(d) {
            return colorScale(d.group);
        });
    
    simulation
        .nodes(network.nodes)
        .on('tick', tickSimulation);
    
    simulation
        .force('link')
        .links(network.links);
    
    function tickSimulation() {
        linkEnter
            .attr('x1', function(d) { return d.source.x;})
            .attr('y1', function(d) { return d.source.y;})
            .attr('x2', function(d) { return d.target.x;})
            .attr('y2', function(d) { return d.target.y;});
    
        nodeEnter
            .attr('cx', function(d) { return d.x;})
            .attr('cy', function(d) { return d.y;});
    }

    nodeEnter.call(drag);
}

var simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(function(d) { return d.id; }))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(width / 2, height / 2));

var drag = d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}