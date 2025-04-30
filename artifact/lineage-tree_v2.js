const SHARED_WIDTH = window.innerWidth - 20;
const SHARED_PADDING= 30;

function initLineageTree(data) {
    const width = SHARED_WIDTH;
   

    const minWidth = 10;
    const minHeight = 10;

    // Build color palette across all tags in the hierarchy
    const allTags = [];
    (function collectTags(node) {
        if (node.tags) allTags.push(node.tags);
        if (node.children) node.children.forEach(collectTags);
    })(data);

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, allTags.length));

    // Compute hierarchy and layout
    const hierarchy = d3.hierarchy(data)
        .sum(d => {
            if (d.endDate && d.startDate) {
                const lifespan = d.endDate - d.startDate;
                return Math.max(minWidth, Math.log1p(lifespan));
            }
            return minWidth;
        })
        .sort((a, b) =>  b.startDate- a.startDate|| a.height - b.height  );

    const nodeHeight = 80; // allow 80px per depth level
    const root = d3.partition()
        .size([width, (hierarchy.height + 1) * nodeHeight])
        (hierarchy);

    const svg = d3.select("#lineage-tree-container > svg")
        .attr("viewBox", [0, 0, width,  (hierarchy.height + 1) * nodeHeight + 20])
        .attr("width", width)
        .attr("height", (hierarchy.height + 1) * nodeHeight+20)
        .style("margin", SHARED_PADDING);

    svg.selectAll('*').remove();

    const cell = svg
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        // .attr("transform", d => `translate(${d.x0},${d.y0})`);
        .attr("transform", d => `translate(${d.x0 },${d.y0})`);

    const rect = cell.append("rect")
        .attr("width", d => rectWidth(d))
        .attr("height", d => Math.max(d.y1 - d.y0, minHeight))
        .attr("fill-opacity", 0.6)
        .attr("fill", d => d.depth === 0 ? "#dcf0fc" : color(d.data.tags))
        .style("cursor", "pointer")
        .on("click", clicked);

    const text = cell.append("text")
        .style("user-select", "none")
        .style("font-size", "15px")  //  make text smaller here
        .attr("pointer-events", "none")
        .style("stroke", "white")           // white outline
        .style("stroke-width", "3px")      
        .style("paint-order", "stroke")    
        .style("fill", "black")             
        .attr("transform", d => {
            const xCenter = (d.x1 - d.x0) / 2;
            const yOffset = (d.y1 - d.y0) / 2; // distance from top edge (smaller = closer to top)
            return `translate(${xCenter},${yOffset}) rotate(270)`;
        })

        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill-opacity", d => +labelVisible(d))
        .text(d => d.data.tags.substring(1, d.data.tags.length - 1).split(",")[0].replace(/'/g, ''));

    //TODO show all tags in when clicked

    const tspan = text.append("tspan")
        .attr("fill-opacity", d => labelVisible(d) * 0.7);



    cell.append("title")
        .text(d => {
            const days = Math.round((d.data.endDate - d.data.startDate) / 86400);
            return `${d.ancestors().map(d => d.data.tags).reverse().join("/")}\nLifespan: ${days} days`;
        });

    let focus = root;
    function clicked(event, p) {
        if (!p) return;
        focus = focus === p ? p.parent : p;
        if (!focus) return;
    
        // Dispatch a custom event
        const tags = p.data.tags;
        const lineageId = p.data.id || p.data.lineageId || p.data.name;
        const lineageColor = p.depth === 0 ? "#dcf0fc" : color(p.data.tags);

        window.dispatchEvent(new CustomEvent('lineageClicked', {
            detail: {
                lineageId,
                tags,
                startDate: p.data.startDate,
                endDate: p.data.endDate,
                endOfLife: p.data.endOfLife,
                color: lineageColor
            }
        }));
    
        root.each(d => d.target = {
            x0: (d.x0 - focus.x0) / (focus.x1 - focus.x0) * width,
            x1: (d.x1 - focus.x0) / (focus.x1 - focus.x0) * width,
            y0: d.y0 - focus.y0,
            y1: d.y1 - focus.y0
        });
    
        const t = cell.transition().duration(750)
            .attr("transform", d => `translate(${d.target.x0},${d.target.y0})`);
    
        rect.transition(t).attr("width", d => rectWidth(d.target));
        text.transition(t).attr("fill-opacity", d => +labelVisible(d.target));
        tspan.transition(t).attr("fill-opacity", d => labelVisible(d.target) * 0.7);
    }



    function rectWidth(d) {
        const w = d.x1 - d.x0;
        return Math.max(minWidth, w - Math.min(1, w / 2));
    }

    function labelVisible(d) {
        return d.x1 - d.x0 > minWidth && d.y1 - d.y0 > minHeight;
    }

    return svg.node();
}


function parseFixedSubtree(arr, lineageDataMap) {
    const nodes = [];
    for (let i = 0; i < arr.length; i += 2) {
        const lineageId = arr[i];
        const childrenArr = arr[i + 1] || [];
        const nodeInfo = lineageDataMap[lineageId] || {};
        nodes.push({
            id: lineageId,
            tags: nodeInfo.tags || "Unknown",
            startDate: nodeInfo.startDate || "Unknown",
            endDate: nodeInfo.endDate || "Unknown",
            endOfLife: nodeInfo.endOfLife || "Unknown",
            children: Array.isArray(childrenArr) ? parseFixedSubtree(childrenArr, lineageDataMap) : []
        });
    }
    return nodes;
}

async function fetchLineageTreeAsStratifyRoot(root_lineage_id) {
    const data = await execute_database_server_request(`
        SELECT 
            ld.lineage_id,
            ld.subtree,
            ld.tags,
            ld.first_instance_commit_date AS start_date,
            ld.last_instance_commit_date AS end_date,
            ld.end_of_life
        FROM lineage_details ld
        WHERE ld.lineage_id = ${root_lineage_id}
        LIMIT 1
    `);

    const lineageDetails = data[0];
    const rawSubtree = lineageDetails.subtree;

    const fixedSubtreeStr = rawSubtree.replace(/'/g, '"');
    const parsedSubtree = JSON.parse(fixedSubtreeStr);

    async function buildLineageDataMap(parsedSubtree) {
        const lineageIds = new Set();

        function collectIds(arr) {
            for (let i = 0; i < arr.length; i += 2) {
                lineageIds.add(arr[i]);
                if (Array.isArray(arr[i + 1])) collectIds(arr[i + 1]);
            }
        }
        collectIds(parsedSubtree);

        if (lineageIds.size === 0) return {};

        const lineageIdList = Array.from(lineageIds).map(id => `'${id}'`).join(',');

        const childData = await execute_database_server_request(`
            SELECT 
                lineage_id,
                tags,
                first_instance_commit_date AS start_date,
                last_instance_commit_date AS end_date,
                end_of_life
            FROM lineage_details
            WHERE lineage_id IN (${lineageIdList})
        `);

        const map = {};
        childData.forEach(row => {
            map[row.lineage_id] = {
                tags: row.tags,
                startDate: row.start_date,
                endDate: row.end_date,
                endOfLife: row.end_of_life,
            };
        });
        return map;
    }

    const lineageDataMap = await buildLineageDataMap(parsedSubtree);

    const children = parseFixedSubtree(parsedSubtree, lineageDataMap);

    const rootData = {
        id: lineageDetails.lineage_id,
        tags: lineageDetails.tags,
        startDate: lineageDetails.start_date,
        endDate: lineageDetails.end_date,
        endOfLife: lineageDetails.end_of_life,
        children: children
    };

    return rootData
}

window.addEventListener('tagSelected', async function (event) {
    const selectedTag = event.detail;
    const root = await fetchLineageTreeAsStratifyRoot(selectedTag);
    const svgNode = initLineageTree(root);

    // document.getElementById('lineage-tree-container').innerHTML = ''; // clear previous
    // document.getElementById('lineage-tree-container').appendChild(svgNode); // append new SVG
});