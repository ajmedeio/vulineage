// --- Global State ---
let lineageVulnerabilitiesGlobalState = null;
const tooltip = d3.select("#vuln-tooltip");
// --- Fetch All Vulnerability Data for Root Lineage ---
async function fetchLineageVulnerabilitiesGrowth(root_lineage_id, highlightInfo) {
    console.log("Fetching vulnerabilities for root lineage...", root_lineage_id);
    try {
        let dataset = await execute_database_server_request(`
          SELECT id.repository, id.digest, id.committed_date, vr.cve_id, vr.severity 
            FROM lineage_details ld 
                JOIN lineage_id_to_image_id iil ON ld.lineage_id = iil.lineage_id 
                JOIN image_details id ON iil.image_id = id.image_id 
                JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest 
                JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest 
                JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id 
            WHERE ld.lineage_id = ${root_lineage_id} and dtsr.report IS NOT NULL
            ORDER BY id.committed_date
        `);

        lineageVulnerabilitiesGlobalState = lineageVulnerabilitiesGrowthDataPreprocessor(dataset);

        CreateLineageVulnerabilitiesGrowthChart(lineageVulnerabilitiesGlobalState, null);
    } catch (error) {
        console.error("Error fetching vulnerabilities:", error);
    }
}

// --- Preprocess Data ---
function lineageVulnerabilitiesGrowthDataPreprocessor(data) {
    const severityLevels = ["Low", "Medium", "High", "Critical", "Unknown"];
    const grouped = {};
    const imageData = {};

    data.forEach(d => {
        const date = new Date(d.committed_date * 1000);
        const dateStr = date.toDateString();
        const severity = d.severity;

        if (!grouped[dateStr]) grouped[dateStr] = {};
        if (!grouped[dateStr][severity]) grouped[dateStr][severity] = 0;
        grouped[dateStr][severity]++;

        const ts = d.committed_date;
        if (!imageData[ts]) imageData[ts] = {
            date,
            digest: d.digest,
            repository: d.repository,
            ...Object.fromEntries(severityLevels.map(s => [s, 0]))
        };
        imageData[ts][severity]++;
    });

    const dataset = severityLevels.map(severity => {
        const values = Object.keys(grouped).map(date => ({
            date: new Date(date),
            count: grouped[date][severity] || 0
        })).sort((a, b) => a.date - b.date);

        return { severity, values };
    });

    return { dataset, imageData: Object.values(imageData).sort((a, b) => a.date - b.date) };
}

// --- Create Vulnerabilities Line + Bar Chart ---
function CreateLineageVulnerabilitiesGrowthChart(state, highlightInfo = null) {
    const { dataset, imageData } = state;
    const container = document.getElementById('lineage-vulnerabilities-container');
    const WIDTH = container.getBoundingClientRect().width;
    // const WIDTH = window.innerWidth - 20;
    const HEIGHT = 400;
    const BAR_HEIGHT = 100;
    const PADDING = { t: 40, r: 40, b: 40, l: 40 };

    const svg = d3.select("#lineage-vulnerabilities-container > svg");
    svg.selectAll('*').remove();
    svg.attr('width', WIDTH).attr('height', HEIGHT + BAR_HEIGHT);

    const chartWidth = WIDTH - PADDING.l - PADDING.r;
    const chartHeight = HEIGHT - PADDING.t - PADDING.b;

    const chartG = svg.append('g')
        .attr('transform', `translate(${PADDING.l},${PADDING.t})`);

    const allPoints = dataset.flatMap(d => d.values);
    const xScale = d3.scaleTime()
        .domain(d3.extent(allPoints, d => d.date))
        .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allPoints, d => d.count)])
        .range([chartHeight, 0]);

    if (highlightInfo) {
        const bufferDays = 3;
        const msInDay = 86400 * 1000;

        const paddedStart = new Date((highlightInfo.startDate * 1000) - bufferDays * msInDay);
        const paddedEnd = new Date((highlightInfo.endDate * 1000) + bufferDays * msInDay);

        chartG.append("rect")
            .attr("x", xScale(paddedStart))
            .attr("y", 0)
            .attr("width", Math.max(20, xScale(paddedEnd) - xScale(paddedStart)))
            .attr("height", chartHeight)
            .attr("fill", highlightInfo.color)
            .attr("opacity", 0.6)
            .lower();
    }

    chartG.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %d %Y')));

    chartG.append('g')
        .call(d3.axisLeft(yScale));

    const severityColors = {
        Low: '#4CAF50', Medium: '#FFC107', High: '#FF5722', Critical: '#D32F2F', Unknown: '#9E9E9E'
    };

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.count));

    dataset.forEach(severityGroup => {
        chartG.append('path')
            .datum(severityGroup.values)
            .attr('fill', 'none')
            .attr('stroke', severityColors[severityGroup.severity])
            .attr('stroke-width', 2)
            .attr('d', line);


        chartG.selectAll(`.dot-${severityGroup.severity}`)
            .data(severityGroup.values)
            .join("circle")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.count))
            .attr("r", 3)
            .attr("fill", severityColors[severityGroup.severity])
            .attr("opacity", 0.8)
            .on("mouseover", (event, d) => {
                const dateStr = d.date.toDateString();
                const image = imageData.find(img => img.date.toDateString() === dateStr);
                if (!image) return;

                showTooltipWithBarChart(event, image);
            })
            .on("mousemove", event => {
                adjustTooltipPosition(event.pageX + 10, event.pageY + 10, tooltip);
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
                tooltip.selectAll("*").remove();
            });

        renderSeverityLegend("vuln-legend");
    });


}

function renderSeverityLegend(containerId) {
    const levels = ["Low", "Medium", "High", "Critical", "Unknown"];
    const severityColors = {
        Low: '#4CAF50',
        Medium: '#FFC107',
        High: '#FF5722',
        Critical: '#D32F2F',
        Unknown: '#9E9E9E'
    };

    const container = d3.select(`#${containerId}`);
    container.selectAll("*").remove(); // clear existing legend

    const legend = container.append("div")
        .style("display", "flex")
        .style("gap", "10px")
        .style("flex-wrap", "wrap")
        .style("font-size", "13px");

    levels.forEach(level => {
        const item = legend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "4px");

        item.append("div")
            .style("width", "12px")
            .style("height", "12px")
            .style("background-color", severityColors[level]);

        item.append("span").text(level);
    });
}


function showTooltipWithBarChart(event, image) {
    // const tooltip = d3.select("#vuln-tooltip");

    const severityLevels = ["Low", "Medium", "High", "Critical", "Unknown"];
    const severityColors = {
        Low: '#4CAF50', Medium: '#FFC107', High: '#FF5722', Critical: '#D32F2F', Unknown: '#9E9E9E'
    };

    const barHeight = 12;
    const barSpacing = 4;
    const totalHeight = severityLevels.length * (barHeight + barSpacing);


    tooltip.style("display", "block");
    adjustTooltipPosition(event.pageX + 10, event.pageY + 10, tooltip);

    tooltip.html(""); // clear previous
    tooltip.append("div")
        .style("font-weight", "bold")
        .style("margin-bottom", "4px")
        .style("color", "#000") // ensure black text
        .text("Vulnerabilities on " + image.date.toDateString());

    // Split long digest into two lines at the middle point
    const fullId = image.repository + '@' + image.digest || "";
    const midpoint = Math.floor(fullId.length / 2);
    const firstHalf = fullId.slice(0, midpoint);
    const secondHalf = fullId.slice(midpoint);


    tooltip.append("div")
        .style("font-size", "10px")
        .style("margin-bottom", "8px")
        .style("color", "#333")
        .html(`Digest:<br>${firstHalf}<wbr>${secondHalf}`);


    const maxCount = d3.max(severityLevels, s => image[s]);
    const xScale = d3.scaleLinear().domain([0, maxCount]).range([0, 180]);

    const maxX = 280;

    const svg = tooltip.append("svg")
        .attr("width", maxX)
        .attr("height", totalHeight)
        .style("margin-top", "4px");

    svg.selectAll("rect")
        .data(severityLevels)
        .join("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * (barHeight + barSpacing))
        .attr("width", d => xScale(image[d]))
        .attr("height", barHeight)
        .attr("fill", d => severityColors[d]);

    svg.selectAll("text")
        .data(severityLevels)
        .join("text")
        .attr("x", d => xScale(image[d]) + 4)
        .attr("y", (d, i) => i * (barHeight + barSpacing) + barHeight - 2)
        .text(d => `${d}: ${image[d] || 0}`)
        .style("font-size", "10px")
        .style("fill", "black");
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


window.addEventListener('tagSelected', async (event) => {
    const rootLineageId = event.detail;
    await fetchLineageVulnerabilitiesGrowth(rootLineageId, null);
});

let clickedLineageEvent = null
let prioritizedLineageEvent = null

function handleLineageEvent(event) {
    const { startDate, endDate, color } = event.detail;
    const highlightInfo = { startDate, endDate, color };
    CreateLineageVulnerabilitiesGrowthChart(lineageVulnerabilitiesGlobalState, highlightInfo);
}

window.addEventListener('lineageClicked', (event) => {
    clickedLineageEvent = event
    prioritizedLineageEvent = event
    handleLineageEvent(prioritizedLineageEvent)
});

window.addEventListener('lineageHovered', (event) => {
    if (clickedLineageEvent === null) {
        clickedLineageEvent = event
    }
    prioritizedLineageEvent = event
    handleLineageEvent(prioritizedLineageEvent)
});

window.addEventListener('lineageExited', (event) => {
    prioritizedLineageEvent = clickedLineageEvent
    handleLineageEvent(prioritizedLineageEvent)
});
