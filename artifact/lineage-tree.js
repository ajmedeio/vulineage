async function initLineageTree(root) {
    // Specify the charts’ dimensions. The height is variable, depending on the layout.
    const width = 450;
    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;

    // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
    // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
    // “bottom”, in the data domain. The width of a column is based on the tree’s height.
    console.log(root)
    const maxVulnerabilityCount = d3.max(root.descendants(), d => d.data.vulnerabilityCount)
    const dx = 32//(width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links.
    const tree = d3.tree().nodeSize([8, 16]);
    const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);

    // Create the SVG container, a layer for the links and a layer for the nodes.
    const svg = d3.select("#lineage-tree-container > svg")
    svg.selectAll('*').remove()

    svg.attr("width", width)
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
            .attr("fill", d => { a = interpolateRdYlGn((d.data["vulnerabilityCount"] / maxVulnerabilityCount)); return a })
            .attr("stroke", d => { a = interpolateRdYlGn((d.data["vulnerabilityCount"] / maxVulnerabilityCount) + .08); return a })
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
}

async function fetchLineageTreeAsHierarchyRoot(lineage_id) {
    return d3.hierarchy({
        name: "Img1",
        vulnerabilityCount: 55,
        children: [
            { name: "Img2", vulnerabilityCount: 35, children: [] },
            { name: "Img3", vulnerabilityCount: 35, children: [] },
            { name: "Img4", vulnerabilityCount: 35, children: [] },
            { name: "Img5", vulnerabilityCount: 25, children: [{ name: "Img7", vulnerabilityCount: 15 }, { name: "Img8", vulnerabilityCount: 50 }] },
            { name: "Img6", vulnerabilityCount: 20, children: [{ name: "Img9", vulnerabilityCount: 1 }] },
        ]
    })
}

async function fetchLineageTreeAsStratifyRoot(lineage_id) {
    var nodeMap = new Map(), linkMap = new Map();
    var stack = [{"id": lineage_id, "parent":"-1", "parent_level":-1}];
    while(stack.length != 0) {
        const s = stack.pop();
        const curr = s.id;
        const parent = s.parent;
        const parent_level = s.parent_level;

        const response = await execute_database_server_request(`
            SELECT ld.lineage_id, ld.childs, ld.parents FROM lineage_details ld 
            WHERE ld.lineage_id = ${curr}
        `)
        data = await response;

        var childs = JSON.parse(data[0].childs.replace(/'/g, '"'));
        var new_parents = JSON.parse(data[0].parents.replace(/'/g, '"'));

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

    // Prepare nodes and links
    const nodes = [];
    const links = [];
    for (const [u, v] of linkMap) {
        links.push({ source: u, target: v, value: 1 });
    }
    links.push({ source: links[links.length-1].target, target: null, value: 1 }); // Ensure root node has parentId null
    
    console.log("Processed Data: ", links);
      
    const stratifyLinks = d3.stratify()
        .id(d => d.source)
        .parentId(d => d.target);
    
    const root = stratifyLinks(links);
    return root
}

// main
window.addEventListener('tagSelected', function (event) {
    console.log(event)
    const selectedTag = event.detail;
    console.log('Selected Tag:', selectedTag);
    fetchLineageTreeAsStratifyRoot(selectedTag).then(root => {
        console.log('Fetched Lineage Tree:', root);
        initLineageTree(root);
    });
});