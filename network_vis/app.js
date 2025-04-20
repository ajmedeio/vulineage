const data = [
    { source: "sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed", target: "-3354698995129944722" },
    { source: "sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed", target: "149092031156422916" },
    { source: "sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed", target: "2836465655639430127" },
    { source: "sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed", target: "1777200922962454973" },
    { source: "sha256:00006f9cbc99df45d6013aff8eb8bce90da15a468631455987aea2f0711f2de1", target: "-1974494776473882207" },
    { source: "sha256:00006f9cbc99df45d6013aff8eb8bce90da15a468631455987aea2f0711f2de1", target: "7162470505526057184" },
    { source: "sha256:000074266c5f90afc753d4150bcddac3131a18108f374d5660555961e23e65e4", target: "3390107586771528472" },
    { source: "sha256:000074266c5f90afc753d4150bcddac3131a18108f374d5660555961e23e65e4", target: "-5412735002926874031" },
    { source: "sha256:000074266c5f90afc753d4150bcddac3131a18108f374d5660555961e23e65e4", target: "-4538924815188122252" },
    { source: "sha256:000074266c5f90afc753d4150bcddac3131a18108f374d5660555961e23e65e4", target: "3194342898534869884" }
];

const width = window.innerWidth * 0.9;
const height = window.innerHeight * 0.7;

const svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height);

const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2));

const links = data.map(d => ({ source: d.source, target: d.target }));
const nodes = Array.from(new Set(links.flatMap(l => [l.source, l.target])), id => ({ id }));

const link = svg.append("g")
    .selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link")
    .attr("stroke-width", 1);

const node = svg.append("g")
    .selectAll(".node")
    .data(nodes)
    .enter().append("circle")
    .attr("class", "node")
    .attr("r", 8)
    .attr("fill", d => d.id.startsWith("sha256") ? "#1f77b4" : "#ff7f0e") 
    .call(d3.drag()
        .on("start", dragStart)
        .on("drag", drag)
        .on("end", dragEnd));

const label = svg.append("g")
    .selectAll(".label")
    .data(nodes)
    .enter().append("text")
    .attr("class", "label")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(d => d.id);

simulation
    .nodes(nodes)
    .on("tick", ticked);

simulation.force("link")
    .links(links);

function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
}
function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function drag(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
