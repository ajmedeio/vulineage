// Global function called when select element is changed
function onCategoryChanged() {
    var select = d3.select('#categorySelect').node();
    // Get current value of select element
    var category = select.options[select.selectedIndex].value;
    // Update chart with the selected category of letters
    updateChart(category);
}

// recall that when data is loaded into memory, numbers are loaded as strings
// this function helps convert numbers into string during data preprocessing
function dataPreprocessor(row) {
    return {
        letter: row.letter,
        frequency: +row.frequency
    };
}

let csvData = null
let yScale = null

var svg = d3.select('svg');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height');

var padding = {t: 60, r: 40, b: 30, l: 40};

// Compute chart dimensions
var chartWidth = svgWidth - padding.l - padding.r;
var chartHeight = svgHeight - padding.t - padding.b;

// Compute the spacing for bar bands based on all 26 letters
var barBand = chartHeight / 26;
var barHeight = barBand * 0.7;

// Create a group element for appending chart elements
var chartG = svg.append('g')
    .attr('transform', 'translate('+[padding.l, padding.t]+')');

// A map with arrays for each category of letter sets
var lettersMap = {
    'all-letters': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    'only-consonants': 'BCDFGHJKLMNPQRSTVWXZ'.split(''),
    'only-vowels': 'AEIOUY'.split('')
};

function updateChart(filterKey) {
    const filteredLetters = lettersMap[filterKey]
    const filteredData = filteredLetters.map(letter => {
        return csvData.find(e => e.letter === letter)
    })
    console.log(filteredData)

    const letters = chartG.selectAll('.letter')
        .data(filteredData, function(d) {return d.letter})
    const letterEnter = letters.enter()
        .append('g')
        .attr('class', 'letter')
    letters.merge(letterEnter)
        .attr('transform', (d, i) => `translate(0, ${i * barBand})`)
        
    letterEnter.append('text')
        .attr('transform', (d, i) => `translate(-16, ${barHeight})`)
        .text(d => d.letter)
    letterEnter.append('rect')
        .attr('transform', (d, i) => `translate(0, 0)`)
        .attr('width', (d) => xScale(+d.frequency * 100))
        .attr('height', barHeight)
        .attr('fill', 'black')

    const letterExit = chartG.selectAll(".letter")
        .data(filteredData, function(d) {return d.letter})
        .exit()
        .remove()
}

async function get_lineage_by_lineage_id(lineage_id) {
    const sqlite_query = `SELECT ld.*, iil.image_id, id.committed_date
        FROM lineage_details ld 
            JOIN lineage_id_to_image_id iil ON ld.lineage_id = iil.lineage_id
            JOIN image_details id ON iil.image_id = id.image_id
        WHERE ld.lineage_id = ${lineage_id}
        ORDER BY id.committed_date`
    return execute_database_server_request(sqlite_query)
}

async function get_vulnerabilities_by_image_id(image_id) {
    const sqlite_query = `SELECT id.*, dtsr.report, dtv.vulnerability_id, vr.*
        FROM image_details id
            JOIN digest_to_scan_report dtsr ON id.digest = dtsr.digest
            JOIN digest_to_vulnerability dtv ON dtsr.digest = dtv.digest
            JOIN vulnerability_record vr ON dtv.vulnerability_id = vr.id
        WHERE dtsr.report IS NOT NULL 
            AND id.image_id = '${image_id}'`
    return execute_database_server_request(sqlite_query)
}

async function execute_database_server_request(sqlite_query) {
    let response = await fetch('http://ec2-204-236-197-103.compute-1.amazonaws.com:9631', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"query": sqlite_query})
    })
    return response.json()
}

(async () => {
    const lineage_data = await get_lineage_by_lineage_id("-1000033263475935320")
    const vulnerability_data = await get_vulnerabilities_by_image_id('sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed')
    console.log("example lineage data", lineage_data)
    console.log("example vulnerabilities data", vulnerability_data)

    csvData = await d3.csv('letter_freq.csv', dataPreprocessor)
    
    letters = lettersMap['all-letters']
    xScale = d3.scaleLinear()
        .domain([0, d3.max(csvData, d => d.frequency * 100)])
        .range([0, chartWidth])
    yScale = d3.scaleBand()
        .domain(letters)
        .range([0, chartHeight])
        .padding(0.1)
    const xBottomAxis = d3.axisBottom(xScale)
    const xTopAxis = d3.axisTop(xScale)

    chartG.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xBottomAxis)
    chartG.append("text")
        .attr("class", "x label")
        .style('transform', `translate(15%, -40px)`)
        .text("Letter Frequency (%)")
    chartG.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, -16)`)
        .call(xTopAxis)

    updateChart('all-letters')
})()
