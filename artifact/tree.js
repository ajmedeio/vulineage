async function get_lineage_by_lineage_id(lineage_id) {
    return {
        name: "Img1",
        vulnerabilityCount: 55,
        children: [
            { name: "Img2", vulnerabilityCount: 35, children: [] },
            { name: "Img3", vulnerabilityCount: 35, children: [] },
            { name: "Img4", vulnerabilityCount: 35, children: [] },
            { name: "Img5", vulnerabilityCount: 25, children: [{ name: "Img7", vulnerabilityCount: 15 }, { name: "Img8", vulnerabilityCount: 50 }] },
            { name: "Img6", vulnerabilityCount: 20, children: [{ name: "Img9", vulnerabilityCount: 1 }] },
        ]
    }
    const sqlite_query = `SELECT ld.*, iil.image_id, id.committed_date
        FROM lineage_details ld 
            JOIN lineage_id_to_image_id iil ON ld.lineage_id = iil.lineage_id
            JOIN image_details id ON iil.image_id = id.image_id
        WHERE ld.lineage_id = ${lineage_id}
        ORDER BY id.committed_date`
    return execute_database_server_request(sqlite_query)
}

async function execute_database_server_request(sqlite_query) {
    let response = await fetch('https://database.vulineage.com', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "query": sqlite_query })
    })
    return response.json()
}

(async () => {
    // Specify the charts’ dimensions. The height is variable, depending on the layout.
    const width = 450;
    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;

    // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
    // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
    // “bottom”, in the data domain. The width of a column is based on the tree’s height.
    const data = await get_lineage_by_lineage_id("-1000033263475935320")
    console.log(data)
    const root = d3.hierarchy(data);
    const maxVulnerabilityCount = d3.max(root.descendants(), d => d.data.vulnerabilityCount)
    const dx = 32//(width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links.
    const tree = d3.tree().nodeSize([32, 64]);
    const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);

    // Create the SVG container, a layer for the links and a layer for the nodes.
    const svg = d3.select("#tree-container > svg")
        .attr("width", width)
        //.attr("height", dx)
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;");

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#FFF")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 2)
        .attr("transform", `translate(225,32)`);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all")
        .attr("transform", `translate(225,32)`);
    
    const interpolateRdYlGn = d3.scaleSequential(d3.interpolateRdYlGn)
    const interpolator = interpolateRdYlGn.interpolator();
    const mirror = (t) => interpolator(1 - t); // Create a mirrored interpolator
    interpolateRdYlGn.interpolator(mirror);

    function update(event, source) {
        console.log("update", event, source)
        const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
        const nodes = root.descendants().reverse();
        const links = root.links();

        tree(root);

        let left = root;
        let right = root;
        root.eachBefore(node => {
            if (node.y < left.y) left = node;
            if (node.y > right.y) right = node;
        });
        
        const height = right.y - left.y + marginLeft + marginRight;

        const transition = svg.transition()
            .duration(duration)
            .attr("height", height)
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

        // Update the nodes…
        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });


        nodeEnter.append("text")
            .attr("dx", "0.31em")
            .attr("y", d => d._children ? -6 : 6)
            .attr("text-anchor", d => d._children ? "end" : "start")
            .text(d => d.data.name)
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .attr("stroke", "white")
            .attr("paint-order", "stroke");

        nodeEnter.append("circle")
            .attr("r", 6)
            .attr("opacity", 0.95)
            .attr("fill", d => { a = interpolateRdYlGn((d.data["vulnerabilityCount"] / maxVulnerabilityCount)); console.log(d); return a })
            .attr("stroke", d => { a = interpolateRdYlGn((d.data["vulnerabilityCount"] / maxVulnerabilityCount) + .08); console.log(d); return a })
            .attr("stroke-width", 1)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 6);
                d3.select(this).attr("stroke-width", 2);
                d3.select(this).attr("opacity", 1);
            })
            .on("mouseout", function (event, d) {
                d3.select(this).attr("r", 6);
                d3.select(this).attr("stroke-width", 1);
                d3.select(this).attr("opacity", 0.95);
            });

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.x},${source.y})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        // Update the links…
        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().append("path")
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // Transition links to their new position.
        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition(transition).remove()
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            });

        // Stash the old positions for transition.
        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Do the first update to the initial configuration of the tree
    root.x0 = 0;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
    });

    update(null, root);
})()
