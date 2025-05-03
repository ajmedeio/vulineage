// const SHARED_WIDTH = window.innerWidth - 20;
const SHARED_PADDING = 30;
let clickedLineage = null;
function initLineageTree(data) {
    const container = document.getElementById('lineage-vulnerabilities-container');
    const SHARED_WIDTH = container.getBoundingClientRect().width;
    const width = SHARED_WIDTH;
    let isTooltipPinned = false;
    const minWidth = 10;
    const minHeight = 10;

    // Build color palette across all tags in the hierarchy
    const allTags = [];
    (function collectTags(node) {
        if (node.tags) allTags.push(node.tags);
        if (node.children) node.children.forEach(collectTags);
    })(data);

    // Compute hierarchy and layout
    const hierarchy = d3.hierarchy(data)
        .sum(d => {
            if (d.endDate && d.startDate) {
                const lifespan = d.endDate - d.startDate;
                return Math.max(minWidth, Math.log1p(lifespan));
            }
            return minWidth;
        })
        .sort((a, b) => b.startDate - a.startDate || b.endDate - b.endDate || b.endOfLife - a.endOfLife);

    const nodeHeight = 80; // allow 80px per depth level
    const root = d3.partition().size([width, (hierarchy.height + 1) * nodeHeight])(hierarchy);
    let maxDepth = 0
    root.descendants().forEach(node => {
        maxDepth = Math.max(node.depth, maxDepth)
    })
    const color = d3.scaleOrdinal(d3.quantize(t => d3.interpolateHsl("mediumpurple", d3.hsl("mediumpurple").darker(2))(t), maxDepth + 1));

    const svg = d3.select("#lineage-tree-container > svg")
        .attr("viewBox", [0, 0, width, (hierarchy.height + 1) * nodeHeight + 20])
        .attr("width", width)
        .attr("height", (hierarchy.height + 1) * nodeHeight + 20)
        .style("margin", SHARED_PADDING);

    svg.selectAll('*').remove();

    const cell = svg
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    const rect = cell.append("rect")
        .attr("width", d => rectWidth(d))
        .attr("height", d => Math.max(d.y1 - d.y0, minHeight))
        .attr("fill-opacity", 0.6)
        .attr("fill", d => color(d.depth))
        .attr("stroke", d => {
            if (d.data.endOfLife === 1) return "lightgreen";
            return "gray";
        })
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("click", clicked)
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut);


    const text = cell.append("text")
        .style("user-select", "none")
        .style("font-size", "16px")
        .attr("pointer-events", "none")
        .style("stroke", "white")
        .style("stroke-width", "1px")
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

    const tspan = text.append("tspan")
        .attr("fill-opacity", d => labelVisible(d) * 0.7);

    let focus = root;
    function clicked(event, p) {
        if (clickedLineage !== null) {
            clickedLineage.attr("stroke", d => {
                if (d.data.endOfLife === 1) return "lightgreen";
                return "gray";
            })
        }
        clickedLineage = d3.select(event.target)
        if (!p) return;
        focus = focus === p ? p.parent : p;
        if (!focus) return;

        // Dispatch a custom event
        const tags = p.data.tags;
        const lineageId = p.data.id || p.data.lineageId || p.data.name;
        const lineageColor = color(p.depth);

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
    }

    function handleMouseOver(event, d) {
        const lineageId = d.data.id;
        const tooltip = document.getElementById("icicle-tooltip");

        execute_database_server_request(`
          SELECT 
            ld.lineage_id,
            ld.first_instance_commit_date,
            ld.last_instance_commit_date,
            ld.tags AS lineage_tags,
            ld.end_of_life,
            id.image_id,
            id.tag_list AS image_tags,
            id.base_tag AS image_base_tag,
            id.committed_date AS image_commit_date
          FROM 
            lineage_details ld
          JOIN 
            lineage_id_to_image_id ili ON ld.lineage_id = ili.lineage_id
          JOIN 
            image_details id ON ili.image_id = id.image_id
          WHERE 
            ld.lineage_id = '${lineageId}'
          ORDER BY id.committed_date DESC
          LIMIT 1;
        `).then(res => {
            const data = res[0];
            if (!data) {
                tooltip.innerHTML = `<strong>No image found for lineage ${lineageId}</strong>`;
            } else {
                // Dispatch a custom event
                const tags = d.data.tags;
                const lineageId = d.data.id || d.data.lineageId || d.data.name;
                const lineageColor = color(d.depth);
                
                const target = d3.select(event.target)
                target.attr("stroke", 'yellow')
                if (clickedLineage !== null) {
                        clickedLineage.attr("stroke", d => {
                            if (d.data.id !== target.data.id) return 'yellow'
                            if (d.data.endOfLife === 1) return "lightgreen";
                            return "gray";
                        })
                }

                window.dispatchEvent(new CustomEvent('lineageHovered', {
                    detail: {
                        lineageId,
                        tags,
                        startDate: d.data.startDate,
                        endDate: d.data.endDate,
                        endOfLife: d.data.endOfLife,
                        color: lineageColor
                    }
                }));
                
                const mainTag = data.lineage_tags ? data.lineage_tags.substring(1, d.data.tags.length - 1).split(",")[0].replace(/'/g, '') : "N/A";
                const imageTags = data.image_tags ? data.image_tags.replace(/[\[\]']+/g, '') : "N/A";
                const lineageTags = data.lineage_tags ? data.lineage_tags.replace(/[\[\]']+/g, '') : "N/A";
                tooltip.innerHTML = `
                    <h3>Lineage <code>${mainTag}</code></h3>
                    <strong>Latest Image ID:</strong> <code>${data.image_id}</code><br>
                    <strong>Image Tags:</strong> ${imageTags}<br>
                    <strong>Base Image Tag:</strong> ${data.image_base_tag || "N/A"}<br>
                    <strong>Latest Image Commit:</strong> ${formatDate(data.image_commit_date)}<br><br>
                    <strong>Lineage Start:</strong> ${formatDate(data.first_instance_commit_date)}<br>
                    <strong>Lineage Status:</strong> ${!data.end_of_life ? `<span style="color:red; font-weight:bold;">🛑 End of Life</span>` : `<span style="color:green;">✅ Active</span>`}
                `;
            }
            tooltip.style.display = "block";
        });
    }

    function handleMouseMove(event) {
        const tooltip = document.getElementById("icicle-tooltip");
        //adjustTooltipPosition(event.pageX + 10, event.pageY + 10, tooltip);
    }

    function handleMouseOut(d) {
        d3.select(d.target).attr("stroke", d => {
            if (d.data.endOfLife === 1) return "lightgreen";
            return "gray";
        })
        if (clickedLineage !== null) {
            clickedLineage.attr("stroke", 'yellow');
        }
        const tooltip = document.getElementById("icicle-tooltip");
        tooltip.style.display = "none";
        window.dispatchEvent(new CustomEvent('lineageExited', {}));
    }

    function formatDate(unixTimestamp) {
        if (!unixTimestamp || isNaN(unixTimestamp)) return "N/A";
        return new Date(unixTimestamp * 1000).toLocaleString();
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

// To handle the tooltip don't go outside screen
function adjustTooltipPosition(left, top, tooltip) {
    const rect = tooltip.node().getBoundingClientRect();
    const tooltipWidth = rect.width;
    const tooltipHeight = rect.height;

    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    let adjustedLeft = left;
    let adjustedTop = top;
    if (left + tooltipWidth > pageWidth) {
        adjustedLeft = left - tooltipWidth - 20;
    }
    if (top + tooltipHeight > pageHeight) {
        adjustedTop = top - tooltipHeight - 20;
    }

    tooltip.style("left", adjustedLeft + "px")
           .style("top", adjustedTop + "px");
}

window.addEventListener('tagSelected', async function (event) {
    const selectedTag = event.detail;
    const root = await fetchLineageTreeAsStratifyRoot(selectedTag);
    const svgNode = initLineageTree(root);
});