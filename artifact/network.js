var svg = d3.select('svg');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height');
var padding = {t: 40, r: 40, b: 40, l: 40};

// Compute chart dimensions
var width = svgWidth - padding.l - padding.r;
var height = svgHeight - padding.t - padding.b;

var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
var linkScale = d3.scaleSqrt().range([1,10]);

fetchData();
async function fetchData() {
    var nodeMap = new Map(), linkMap = new Map();
    var stack = [{"id": "7038950296606474977", "parent":"-1", "parent_level":-1}];
    while(stack.length != 0) {
        const s = stack.pop();
        const curr = s.id;
        const parent = s.parent;
        const parent_level = s.parent_level;

        const response = await fetch("https://database.vulineage.com", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "query": `SELECT ld.lineage_id, ld.childs, ld.parents FROM lineage_details ld WHERE ld.lineage_id = ${curr}`
            })
        });
        data = await response.json();

        var childs = JSON.parse(data[0].childs.replace(/'/g, '"'));
        var new_parents = JSON.parse(data[0].parents.replace(/'/g, '"'));
        console.log(`Fetched Data at level ${new_parents.length} is:`, data[0]);

        // The idea of child.parent = parent.parent + 1 didn't worked out and each child lineage had more more than 2 parents
        // If curr node is achieved by new_parents.length more than earlier then we will update linkMap,
        // as it means it have been now reached by a closer grandparent than earlier; eventually by actual parent
        // Dijkstra kinda idea
        if(parent != "-1" && (nodeMap.get(curr)==undefined || nodeMap.get(curr) <= parent_level+1))
            linkMap.set(curr, parent);
        else if(nodeMap.get(curr)!=undefined && nodeMap.get(curr) > parent_level+1)
            continue; // already got to "curr" node by better/closer grandparent
        nodeMap.set(curr, parent_level+1);

        for(var i=0; i<childs.length; i++) {
            stack.push({"id": childs[i], "parent": curr, "parent_level":parent_level+1});
        }
    }

    var nodes=[], links=[];
    for(const [u, v] of linkMap) {
        links.push({"source": u, "target": v, "value": 1});
    }
    for(const [u, v] of nodeMap) {
        nodes.push({"id": u, "group": v})
    }
    dataset = {"nodes": nodes, "links": links};
    console.log("Processed Data: ", dataset);
    CreateChart(dataset);
};
/*
Need the data to look something like this 
id ~ lineage_id / image_id
group = 0 if lineage_id else image_id; so we can later color them
{
"nodes": [
    {"id": "Myriel", "group": 0}, ...],
"links": [
    {"source": "Napoleon", "target": "Myriel", "value": 1}, ...]
}
*/

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
            return colorScale(d.level);
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