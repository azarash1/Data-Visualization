// State Management
const state = {
    currentYear: 2022,
    view: 'geographic', // 'geographic' or 'compare'
    viewLevel: 'country', // Default to Country
    filters: {
        economic: ['Low', 'Med', 'High'],
        education: ['10%-', '10-25%', '25%+']
    },
    compareMetric: 'physician', // Default metric
    selectedCountries: ['United States', 'Canada']
};

// Dimensions
const margin = { top: 20, right: 20, bottom: 50, left: 60 };
let width, height;

// Data Storage
let mapDataUS, mapDataCanada;
// mortalityData is global

// Color Scales
const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, 100]);
const scatterColorScale = d3.scaleOrdinal(d3.schemeSet2); // Visually pleasing colors

// Metric Labels
const metricLabels = {
    'mortality': 'Mortality Rate (per 100k)',
    'physician': 'Physician Density (per 1k)',
    'insurance': 'Insurance Coverage (%)',
    'expenditure': 'Health Expenditure ($)',
    'economic': 'Economic Bracket',
    'education': 'Education Level',
    'trend': 'Mortality Trend'
};

// Initialization
function init() {
    try {
        if (typeof usStatesData === 'undefined' || typeof canadaProvincesData === 'undefined' || typeof mortalityData === 'undefined') {
            console.error("Data files not loaded properly.");
            return;
        }

        mapDataUS = usStatesData;
        mapDataCanada = canadaProvincesData;

        generateExtraMockData();
        setupEventListeners();
        render();

    } catch (error) {
        console.error("Error initializing:", error);
    }
}

function generateExtraMockData() {
    Object.keys(mortalityData).forEach(region => {
        Object.keys(mortalityData[region]).forEach(year => {
            const d = mortalityData[region][year];
            d.physician = +(Math.random() * 5 + 1).toFixed(2);
            d.insurance = +(Math.random() * 20 + 80).toFixed(1);
            d.expenditure = +(Math.random() * 5000 + 3000).toFixed(0);
            // Map categorical to numerical for scatter plot if needed
            d.economic_val = d.economic_status === 'High' ? 3 : d.economic_status === 'Med' ? 2 : 1;
            d.education_val = d.education_level === '25%+' ? 3 : d.education_level === '10-25%' ? 2 : 1;
        });
    });
}

function setupEventListeners() {
    document.getElementById('btn-geo-view').addEventListener('click', () => switchView('geographic'));
    document.getElementById('btn-compare-view').addEventListener('click', () => switchView('compare'));

    // Map Slider
    const mapSlider = document.getElementById('year-slider');
    mapSlider.addEventListener('input', (e) => {
        updateYear(+e.target.value);
    });

    // Compare Slider
    const compareSlider = document.getElementById('compare-year-slider');
    compareSlider.addEventListener('input', (e) => {
        updateYear(+e.target.value);
    });

    document.querySelectorAll('input[name="economic"]').forEach(cb => {
        cb.addEventListener('change', updateFilters);
    });
    document.querySelectorAll('input[name="education"]').forEach(cb => {
        cb.addEventListener('change', updateFilters);
    });
    document.querySelectorAll('input[name="view-level"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.viewLevel = e.target.value;
            render();
        });
    });

    // Metric Buttons
    document.querySelectorAll('.metric-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.compareMetric = e.target.dataset.metric;
            renderCharts();
        });
    });

    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('trend-popup').classList.add('hidden');
    });
}

function updateYear(year) {
    state.currentYear = year;
    document.getElementById('year-display').textContent = year;
    document.getElementById('compare-year-display').textContent = year;
    document.getElementById('year-slider').value = year;
    document.getElementById('compare-year-slider').value = year;

    if (state.view === 'geographic') {
        updateMapColors();
    } else {
        renderCharts();
    }
}

function updateFilters() {
    state.filters.economic = Array.from(document.querySelectorAll('input[name="economic"]:checked')).map(cb => cb.value);
    state.filters.education = Array.from(document.querySelectorAll('input[name="education"]:checked')).map(cb => cb.value);

    if (state.view === 'geographic') {
        updateMapColors();
    } else {
        renderCharts();
    }
}

function switchView(viewName) {
    state.view = viewName;

    document.getElementById('btn-geo-view').classList.toggle('active', viewName === 'geographic');
    document.getElementById('btn-compare-view').classList.toggle('active', viewName === 'compare');

    document.getElementById('geographic-view').classList.toggle('hidden', viewName !== 'geographic');
    document.getElementById('compare-view').classList.toggle('hidden', viewName !== 'compare');

    const compareFilters = document.getElementById('compare-filters');
    if (viewName === 'compare') {
        compareFilters.classList.remove('hidden');
        renderCharts();
    } else {
        compareFilters.classList.add('hidden');
        renderMap();
    }
}

// --- Map Logic ---

function render() {
    if (state.view === 'geographic') {
        renderMap();
    } else {
        renderCharts();
    }
}

function renderMap() {
    const container = document.getElementById('map-container');
    container.innerHTML = '';
    width = container.clientWidth;
    height = container.clientHeight || 500;

    const svg = d3.select('#map-container').append('svg')
        .attr('width', width)
        .attr('height', height);

    const projection = d3.geoMercator()
        .center([-95, 55])
        .scale(width * 0.4)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    const usFeatures = topojson.feature(mapDataUS, mapDataUS.objects.states).features;
    const caFeatures = mapDataCanada.features;

    if (state.viewLevel === 'country') {
        const usMerged = topojson.merge(mapDataUS, mapDataUS.objects.states.geometries);

        g.append('path')
            .datum(usMerged)
            .attr('class', 'us-country')
            .attr('d', path)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', (e) => handleMouseOver(e, null, 'USA'))
            .on('mouseout', handleMouseOut)
            .on('click', (e) => handleClick(e, null, 'USA'));

        // Merge Canada
        const caTopology = topojson.topology({ provinces: mapDataCanada });
        const caMerged = topojson.merge(caTopology, caTopology.objects.provinces.geometries);

        g.append('path')
            .datum(caMerged)
            .attr('class', 'ca-country')
            .attr('d', path)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', (e) => handleMouseOver(e, null, 'Canada'))
            .on('mouseout', handleMouseOut)
            .on('click', (e) => handleClick(e, null, 'Canada'));

    } else {
        g.selectAll('.us-state')
            .data(usFeatures)
            .enter().append('path')
            .attr('class', 'us-state')
            .attr('d', path)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .on('click', handleClick);

        g.selectAll('.ca-province')
            .data(caFeatures)
            .enter().append('path')
            .attr('class', 'ca-province')
            .attr('d', path)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .on('click', handleClick);
    }

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    updateMapColors();
}

function getAggregatedCountryData(country, year) {
    let sum = 0, count = 0;
    let sums = { mortality_rate: 0, physician: 0, insurance: 0, expenditure: 0 };

    Object.keys(mortalityData).forEach(region => {
        const isCanada = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].includes(region);

        if ((country === 'Canada' && isCanada) || (country === 'USA' && !isCanada)) {
            const d = mortalityData[region][year];
            if (d) {
                const econMatch = state.filters.economic.length === 0 || state.filters.economic.includes(d.economic_status);
                const eduMatch = state.filters.education.length === 0 || state.filters.education.includes(d.education_level);

                if (econMatch && eduMatch) {
                    sums.mortality_rate += d.mortality_rate;
                    sums.physician += d.physician;
                    sums.insurance += d.insurance;
                    sums.expenditure += d.expenditure;
                    count++;
                }
            }
        }
    });

    if (count === 0) return null;

    return {
        mortality_rate: (sums.mortality_rate / count).toFixed(2),
        physician: (sums.physician / count).toFixed(2),
        insurance: (sums.insurance / count).toFixed(1),
        expenditure: (sums.expenditure / count).toFixed(0),
        economic_status: 'Mixed',
        education_level: 'Mixed'
    };
}

function updateMapColors() {
    if (state.viewLevel === 'country') {
        const usData = getAggregatedCountryData('USA', state.currentYear);
        const caData = getAggregatedCountryData('Canada', state.currentYear);
        d3.select('.us-country').attr('fill', usData ? colorScale(usData.mortality_rate) : '#eee');
        d3.select('.us-country').attr('fill', usData ? colorScale(usData.mortality_rate) : '#eee');
        d3.select('.ca-country').attr('fill', caData ? colorScale(caData.mortality_rate) : '#eee');
    } else {
        d3.selectAll('.us-state, .ca-province')
            .attr('fill', d => {
                const name = d.properties.name;
                const data = mortalityData[name] ? mortalityData[name][state.currentYear] : null;
                if (!data) return '#eee';
                const econMatch = state.filters.economic.length === 0 || state.filters.economic.includes(data.economic_status);
                const eduMatch = state.filters.education.length === 0 || state.filters.education.includes(data.education_level);
                if (!econMatch || !eduMatch) return '#f0f0f0';
                return colorScale(data.mortality_rate);
            });
    }
}

function handleMouseOver(event, d, country) {
    const tooltip = document.getElementById('tooltip');
    let content = '';
    const name = country ? (country === 'USA' ? 'United States' : 'Canada') : d.properties.name;
    const data = country ? getAggregatedCountryData(country, state.currentYear) : (mortalityData[name] ? mortalityData[name][state.currentYear] : null);

    if (data) {
        content = `<h4>${name}</h4>
            <p><strong>Avg Mortality:</strong> ${data.mortality_rate}</p>
            <p class="hint">Further Analysis</p>`;
    } else {
        content = `<h4>${name}</h4><p>No data</p>`;
    }

    tooltip.innerHTML = content;
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY - 28) + 'px';
    tooltip.classList.remove('hidden');

    d3.select(event.target).classed('path-highlight', true);
}

function handleMouseOut(event, d) {
    document.getElementById('tooltip').classList.add('hidden');
    d3.select(event.target).classed('path-highlight', false);
}

function handleClick(event, d, country) {
    const name = country ? (country === 'USA' ? 'United States' : 'Canada') : d.properties.name;
    showTrendPopup(name, !!country);
}

// --- Trend Popup Logic ---

function showTrendPopup(name, isCountry) {
    const popup = document.getElementById('trend-popup');
    const title = document.getElementById('popup-title');
    title.textContent = `Further Analysis - ${name}`;
    popup.classList.remove('hidden');

    const metrics = ['mortality_rate', 'physician', 'insurance', 'expenditure'];
    const titles = ['Mortality Rate', 'Physician Density', 'Insurance Coverage', 'Health Expenditure'];
    const ids = ['chart-mortality', 'chart-physician', 'chart-insurance', 'chart-expenditure'];
    const years = d3.range(2000, 2023);

    // Helper function to format large numbers
    const formatNumber = (value, metric) => {
        if (metric === 'expenditure' || Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
        }
        return value.toFixed(1);
    };

    metrics.forEach((metric, idx) => {
        const containerId = ids[idx];
        const container = document.getElementById(containerId);

        // Clear and add title + resize handles
        container.innerHTML = `
            <h4>${titles[idx]}</h4>
            <div class="chart-content"></div>
            <div class="chart-resizer chart-resizer-tl"></div>
            <div class="chart-resizer chart-resizer-tr"></div>
            <div class="chart-resizer chart-resizer-bl"></div>
            <div class="chart-resizer chart-resizer-br"></div>
        `;

        // Function to render chart
        const renderChart = () => {
            const chartContent = container.querySelector('.chart-content');
            chartContent.innerHTML = '';
            const w = container.clientWidth;
            const h = container.clientHeight - 30;
            const p = { top: 10, right: 30, bottom: 30, left: 50 };

            const svg = d3.select(chartContent).append('svg').attr('width', w).attr('height', h);

            let values = [];
            if (isCountry) {
                values = years.map(y => {
                    const d = getAggregatedCountryData(name === 'United States' ? 'USA' : 'Canada', y);
                    return d ? +d[metric] : 0;
                });
            } else {
                values = years.map(y => mortalityData[name] ? mortalityData[name][y][metric] : 0);
            }

            const chartData = years.map((y, i) => ({ year: y, val: values[i] }));
            const minVal = d3.min(values);
            const maxVal = d3.max(values);
            const x = d3.scaleLinear().domain([2000, 2022]).range([p.left, w - p.right]);
            const y = d3.scaleLinear().domain([minVal * 0.9, maxVal * 1.1]).range([h - p.bottom, p.top]);

            svg.append('g').attr('transform', `translate(0,${h - p.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));

            // Custom Y-axis formatting
            svg.append('g')
                .attr('transform', `translate(${p.left},0)`)
                .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatNumber(d, metric)));

            const line = d3.line().x(d => x(d.year)).y(d => y(d.val));
            svg.append('path').datum(chartData).attr('fill', 'none').attr('stroke', '#e74c3c').attr('stroke-width', 2).attr('d', line);
        };

        // Initial render
        renderChart();

        // Add resize functionality
        makeChartResizable(container, renderChart);
    });
}

// Function to make individual charts resizable
function makeChartResizable(chartBox, redrawCallback) {
    const resizers = chartBox.querySelectorAll('.chart-resizer');
    let original_width = 0;
    let original_height = 0;
    let original_mouse_x = 0;
    let original_mouse_y = 0;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            original_width = parseFloat(getComputedStyle(chartBox, null).getPropertyValue('width').replace('px', ''));
            original_height = parseFloat(getComputedStyle(chartBox, null).getPropertyValue('height').replace('px', ''));
            original_mouse_x = e.pageX;
            original_mouse_y = e.pageY;

            const resize = (e) => {
                if (resizer.classList.contains('chart-resizer-br')) {
                    const width = original_width + (e.pageX - original_mouse_x);
                    const height = original_height + (e.pageY - original_mouse_y);
                    if (width > 150) chartBox.style.width = width + 'px';
                    if (height > 100) chartBox.style.height = height + 'px';
                } else if (resizer.classList.contains('chart-resizer-bl')) {
                    const width = original_width - (e.pageX - original_mouse_x);
                    const height = original_height + (e.pageY - original_mouse_y);
                    if (width > 150) chartBox.style.width = width + 'px';
                    if (height > 100) chartBox.style.height = height + 'px';
                } else if (resizer.classList.contains('chart-resizer-tr')) {
                    const width = original_width + (e.pageX - original_mouse_x);
                    const height = original_height - (e.pageY - original_mouse_y);
                    if (width > 150) chartBox.style.width = width + 'px';
                    if (height > 100) chartBox.style.height = height + 'px';
                } else if (resizer.classList.contains('chart-resizer-tl')) {
                    const width = original_width - (e.pageX - original_mouse_x);
                    const height = original_height - (e.pageY - original_mouse_y);
                    if (width > 150) chartBox.style.width = width + 'px';
                    if (height > 100) chartBox.style.height = height + 'px';
                }

                // Redraw chart with new dimensions
                if (redrawCallback) {
                    redrawCallback();
                }
            };

            const stopResize = () => {
                window.removeEventListener('mousemove', resize);
                window.removeEventListener('mouseup', stopResize);
            };

            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });
    });
}

// --- Compare View Charts ---

function renderCharts() {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';

    const w = container.clientWidth;
    const h = container.clientHeight || 500;
    const p = { top: 40, right: 50, bottom: 50, left: 60 };

    const svg = d3.select('#chart-container').append('svg').attr('width', w).attr('height', h);
    const tooltip = d3.select('#tooltip');

    if (state.compareMetric === 'trend') {
        // Line Chart: Mortality vs Years
        renderTrendChart(svg, w, h, p, tooltip);
    } else {
        // Scatter Plot: Mortality vs Metric
        renderScatterPlot(svg, w, h, p, tooltip);
    }
}

function renderTrendChart(svg, w, h, p, tooltip) {
    const years = d3.range(2000, 2023);
    let seriesData = [];

    // Gather data for all regions/countries matching filters
    if (state.viewLevel === 'country') {
        seriesData = ['United States', 'Canada'].map(country => {
            return {
                name: country,
                values: years.map(y => {
                    const d = getAggregatedCountryData(country === 'United States' ? 'USA' : 'Canada', y);
                    return { year: y, val: d ? +d.mortality_rate : 0 };
                })
            };
        });
    } else {
        Object.keys(mortalityData).forEach(region => {
            const d = mortalityData[region][2022]; // Check filters against current year
            if (d) {
                const econMatch = state.filters.economic.length === 0 || state.filters.economic.includes(d.economic_status);
                const eduMatch = state.filters.education.length === 0 || state.filters.education.includes(d.education_level);
                if (econMatch && eduMatch) {
                    seriesData.push({
                        name: region,
                        values: years.map(y => {
                            const dy = mortalityData[region][y];
                            return { year: y, val: dy ? dy.mortality_rate : 0 };
                        })
                    });
                }
            }
        });
    }

    const allVals = seriesData.flatMap(s => s.values.map(v => v.val));
    const x = d3.scaleLinear().domain([2000, 2022]).range([p.left, w - p.right]);
    const y = d3.scaleLinear().domain([d3.min(allVals) * 0.9, d3.max(allVals) * 1.1]).range([h - p.bottom, p.top]);

    svg.append('g').attr('transform', `translate(0,${h - p.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
    svg.append('g').attr('transform', `translate(${p.left},0)`).call(d3.axisLeft(y));

    svg.append('text').attr('transform', 'rotate(-90)').attr('y', 20).attr('x', -h / 2).attr('fill', '#333').style('text-anchor', 'middle').text('Mortality Rate');

    const line = d3.line().x(d => x(d.year)).y(d => y(d.val));

    seriesData.forEach((series, i) => {
        const isCanada = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].includes(series.name);

        let color;
        if (state.viewLevel === 'country') {
            color = series.name === 'United States' ? '#FF0000' : '#0000FF';
        } else {
            color = isCanada ? '#0000FF' : '#FF0000';
        }

        svg.append('path')
            .datum(series.values)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .attr('d', line)
            .on('mouseover', (event) => {
                const hoveredPath = d3.select(event.target);
                const pathData = hoveredPath.attr('d');

                // Insert a black border path behind this one
                hoveredPath.node().parentNode.insertBefore(
                    hoveredPath.clone(true)
                        .attr('class', 'hover-border')
                        .attr('stroke', '#000')
                        .attr('stroke-width', 8)
                        .attr('opacity', 1)
                        .node(),
                    hoveredPath.node()
                );

                hoveredPath.attr('stroke-width', 6).attr('opacity', 1).raise();
                tooltip.html(`<strong>${series.name}</strong>`).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 20) + 'px').classed('hidden', false);
            })
            .on('mouseout', (event) => {
                // Remove the border path
                d3.select(event.target.parentNode).select('.hover-border').remove();
                d3.select(event.target).attr('stroke-width', 2).attr('opacity', 0.7);
                tooltip.classed('hidden', true);
            });
    });
}

function renderScatterPlot(svg, w, h, p, tooltip) {
    const metric = state.compareMetric;
    let dataPoints = [];

    // Collect data points for CURRENT YEAR
    if (state.viewLevel === 'country') {
        ['United States', 'Canada'].forEach(country => {
            const d = getAggregatedCountryData(country === 'United States' ? 'USA' : 'Canada', state.currentYear);
            if (d) {
                let val = d[metric];
                if (metric === 'economic') val = 2; // Placeholder for categorical
                if (metric === 'education') val = 2;
                dataPoints.push({ name: country, x: d.mortality_rate, y: val });
            }
        });
    } else {
        Object.keys(mortalityData).forEach(region => {
            const d = mortalityData[region][state.currentYear];
            if (d) {
                const econMatch = state.filters.economic.length === 0 || state.filters.economic.includes(d.economic_status);
                const eduMatch = state.filters.education.length === 0 || state.filters.education.includes(d.education_level);

                if (econMatch && eduMatch) {
                    let val = d[metric];
                    if (metric === 'economic') val = d.economic_val;
                    if (metric === 'education') val = d.education_val;
                    dataPoints.push({ name: region, x: d.mortality_rate, y: val });
                }
            }
        });
    }

    const xVals = dataPoints.map(d => d.x);
    const yVals = dataPoints.map(d => d.y);

    const x = d3.scaleLinear().domain([d3.min(xVals) * 0.9, d3.max(xVals) * 1.1]).range([p.left, w - p.right]);
    const y = d3.scaleLinear().domain([d3.min(yVals) * 0.9, d3.max(yVals) * 1.1]).range([h - p.bottom, p.top]);

    svg.append('g').attr('transform', `translate(0,${h - p.bottom})`).call(d3.axisBottom(x));
    svg.append('g').attr('transform', `translate(${p.left},0)`).call(d3.axisLeft(y));

    // Labels
    svg.append('text').attr('x', w / 2).attr('y', h - 10).attr('fill', '#333').style('text-anchor', 'middle').text('Mortality Rate');
    svg.append('text').attr('transform', 'rotate(-90)').attr('y', 20).attr('x', -h / 2).attr('fill', '#333').style('text-anchor', 'middle').text(metricLabels[metric]);

    // Best Fit Lines
    const usPoints = dataPoints.filter(d => !['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].includes(d.name) && d.name !== 'Canada');
    const caPoints = dataPoints.filter(d => ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].includes(d.name) || d.name === 'Canada');

    [
        { points: usPoints, color: '#FF0000' },
        { points: caPoints, color: '#0000FF' }
    ].forEach(group => {
        if (group.points.length > 1) {
            const n = group.points.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            group.points.forEach(d => {
                sumX += +d.x;
                sumY += +d.y;
                sumXY += (+d.x) * (+d.y);
                sumXX += (+d.x) * (+d.x);
            });

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            const groupXVals = group.points.map(d => d.x);
            const x1 = d3.min(groupXVals);
            const x2 = d3.max(groupXVals);
            const y1 = slope * x1 + intercept;
            const y2 = slope * x2 + intercept;

            svg.append('line')
                .attr('x1', x(x1))
                .attr('y1', y(y1))
                .attr('x2', x(x2))
                .attr('y2', y(y2))
                .attr('stroke', group.color)
                .attr('stroke-width', 2);
        }
    });

    svg.selectAll('circle')
        .data(dataPoints)
        .enter().append('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 8)
        .attr('fill', d => {
            const isCanada = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].includes(d.name) || d.name === 'Canada';
            return isCanada ? '#0000FF' : '#FF0000';
        })
        .attr('opacity', 0.8)
        .attr('stroke', '#fff')
        .on('mouseover', (event, d) => {
            d3.select(event.target).attr('r', 12).attr('opacity', 1);
            tooltip.html(`<strong>${d.name}</strong><br>Mortality: ${d.x}<br>${metricLabels[metric]}: ${d.y}`)
                .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 20) + 'px').classed('hidden', false);
        })
        .on('mouseout', (event) => {
            d3.select(event.target).attr('r', 8).attr('opacity', 0.8);
            tooltip.classed('hidden', true);
        });

}

function makeResizable() {
    const element = document.querySelector('.popup-content.large');
    const resizers = document.querySelectorAll('.resizer');
    let original_width = 0;
    let original_height = 0;
    let original_x = 0;
    let original_y = 0;
    let original_mouse_x = 0;
    let original_mouse_y = 0;

    for (let i = 0; i < resizers.length; i++) {
        const currentResizer = resizers[i];
        currentResizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
            original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
            original_x = element.getBoundingClientRect().left;
            original_y = element.getBoundingClientRect().top;
            original_mouse_x = e.pageX;
            original_mouse_y = e.pageY;
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });

        function resize(e) {
            if (currentResizer.classList.contains('bottom-right')) {
                const width = original_width + (e.pageX - original_mouse_x);
                const height = original_height + (e.pageY - original_mouse_y);
                if (width > 200) element.style.width = width + 'px';
                if (height > 200) element.style.height = height + 'px';
            } else if (currentResizer.classList.contains('bottom-left')) {
                const height = original_height + (e.pageY - original_mouse_y);
                const width = original_width - (e.pageX - original_mouse_x);
                if (height > 200) element.style.height = height + 'px';
                if (width > 200) {
                    element.style.width = width + 'px';
                }
            } else if (currentResizer.classList.contains('top-right')) {
                const width = original_width + (e.pageX - original_mouse_x);
                const height = original_height - (e.pageY - original_mouse_y);
                if (width > 200) element.style.width = width + 'px';
                if (height > 200) {
                    element.style.height = height + 'px';
                }
            } else {
                const width = original_width - (e.pageX - original_mouse_x);
                const height = original_height - (e.pageY - original_mouse_y);
                if (width > 200) {
                    element.style.width = width + 'px';
                }
                if (height > 200) {
                    element.style.height = height + 'px';
                }
            }
        }

        function stopResize() {
            window.removeEventListener('mousemove', resize);
        }
    }
}

function makeDraggable() {
    const popup = document.querySelector('.popup-content.large');
    const titleBar = popup.querySelector('h3');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    titleBar.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // Check if clicking on the title bar (not the close button)
        if (e.target === titleBar || e.target.parentElement === titleBar) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            popup.style.transform = 'none';
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, popup);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.left = xPos + 'px';
        el.style.top = yPos + 'px';
    }
}

init();
makeResizable();
makeDraggable();
