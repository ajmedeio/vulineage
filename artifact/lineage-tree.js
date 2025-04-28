async function initLineageTree(root) {
    // Specify the charts’ dimensions. The height is variable, depending on the layout.
    const width = window.innerWidth;
    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;

    // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
    // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
    // “bottom”, in the data domain. The width of a column is based on the tree’s height.
    d3.map(root.descendants(), d => { 
        d.data.vulnerabilityCount = (
            d.data.value.critical_vulnerability_count 
            + d.data.value.high_vulnerability_count 
            + d.data.value.medium_vulnerability_count 
            + d.data.value.low_vulnerability_count 
            + d.data.value.unknown_vulnerability_count
        )
    });
    const maxVulnerabilityCount = d3.max(root.descendants(), d => d.data.vulnerabilityCount)
    const dx = 32//(width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links.
    const tree = d3.tree().nodeSize([16, 24]);
    const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);

    // Create the SVG container, a layer for the links and a layer for the nodes.
    const svg = d3.select("#lineage-tree-container > svg")
    svg.selectAll('*').remove()

    svg.attr("style", `font: 10px sans-serif; user-select: none;`);

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#FFF")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 2);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");
    
    const interpolateRdYlGn = d3.scaleSequential(d3.interpolateRdYlGn)
    const interpolator = interpolateRdYlGn.interpolator();
    const mirror = (t) => interpolator(1 - t); // Create a mirrored interpolator
    interpolateRdYlGn.interpolator(mirror);

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
        const nodes = root.descendants().reverse();
        const links = root.links();

        tree(root);

        // Get the bounds of the tree
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        
        root.each(d => {
            if (d.x < x0) x0 = d.x;
            if (d.x > x1) x1 = d.x;
            if (d.y < y0) y0 = d.y;
            if (d.y > y1) y1 = d.y;
        });

        // Compute the new height and width
        const height = y1 - y0 + marginTop + marginBottom;
        const width = x1 - x0 + marginLeft + marginRight;

        // Update SVG size
        svg.attr("height", height)
            .attr("width", width);

        // Center the tree by transforming the whole graph
        const centerX = -x0 + marginLeft;
        const centerY = -y0 + marginTop;
        
        gLink.attr("transform", `translate(${centerX},${centerY})`);
        gNode.attr("transform", `translate(${centerX},${centerY})`);

        let left = root;
        let right = root;
        root.eachBefore(node => {
            if (node.y < left.y) left = node;
            if (node.y > right.y) right = node;
        });
        
        //const height = right.y - left.y + marginLeft + marginRight;
        const transition = svg.transition()
            .duration(duration)
            .attr("height", height)
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);
        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
                console.log("Lineage Clicked:", {event, d})
                let lineageId = d.data.source
                window.dispatchEvent(new CustomEvent('lineageClicked', {
                    detail: { lineageId }
                }))
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
            //.attr('fill', '#FFF')
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

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().append("path")
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition links to their new position.
        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

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

async function fetchLineageTreeAsStratifyRoot(root_lineage_id) {
    var nodeMap = new Map(), linkMap = new Map();
    const lineage_id_to_last_committed_image_map = new Map();
    var stack = [{"id": root_lineage_id, "parent":"-1", "parent_level":-1}];
    while(stack.length != 0) {
        const s = stack.pop();
        
        const curr = s.id;
        const parent = s.parent;
        const parent_level = s.parent_level;

        const data = await execute_database_server_request(`
            SELECT 
                ld.lineage_id,
                ld.childs,
                ld.parents,
                id.*,
                COUNT(CASE WHEN vr.severity = 'Critical' THEN 1 END) as critical_vulnerability_count,
                COUNT(CASE WHEN vr.severity = 'High' THEN 1 END) as high_vulnerability_count,
                COUNT(CASE WHEN vr.severity = 'Medium' THEN 1 END) as medium_vulnerability_count,
                COUNT(CASE WHEN vr.severity = 'Low' THEN 1 END) as low_vulnerability_count,
                COUNT(CASE WHEN vr.severity = 'Unknown' THEN 1 END) as unknown_vulnerability_count
            FROM lineage_details ld 
                JOIN lineage_id_to_image_id litii ON ld.lineage_id = litii.lineage_id
                JOIN image_details id ON litii.image_id = id.image_id
                LEFT JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest 
                LEFT JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest 
                LEFT JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id 
            WHERE ld.lineage_id = ${curr}
            GROUP BY ld.lineage_id, ld.childs, ld.parents, id.image_id
            ORDER BY id.committed_date
            LIMIT 1
        `)
        const lineage_and_last_committed_image_details = data[0]
        console.log(lineage_and_last_committed_image_details)
        lineage_id_to_last_committed_image_map[curr] = lineage_and_last_committed_image_details;

        var childs = JSON.parse(lineage_and_last_committed_image_details.childs.replace(/'/g, '"'));
        var new_parents = JSON.parse(lineage_and_last_committed_image_details.parents.replace(/'/g, '"'));

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

    const links = [];
    for (const [u, v] of linkMap) {
        links.push({ source: u, target: v, value: lineage_id_to_last_committed_image_map[u] });
    }
    links.push({ source: links[links.length-1].target, target: null, value: lineage_id_to_last_committed_image_map[links[links.length-1].target] }); // Ensure root node has parentId null
      
    const stratifyLinks = d3.stratify()
        .id(d => d.source)
        .parentId(d => d.target);
    
    const root = stratifyLinks(links);
    return root
}

// main
window.addEventListener('tagSelected', async function (event) {
    const selectedTag = event.detail;
    const root = await fetchLineageTreeAsStratifyRoot(selectedTag)
    console.log('Fetched Lineage Tree:', { root });
    initLineageTree(root);
});
