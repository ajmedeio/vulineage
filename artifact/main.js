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

(async () => {
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
