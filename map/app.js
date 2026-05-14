const svg = d3.select("#map");
const tooltip = d3.select("#tooltip");
const select = document.querySelector("#countrySelect");
const labelToggle = document.querySelector("#labelToggle");
const selectedName = document.querySelector("#selectedName");
const selectedValue = document.querySelector("#selectedValue");
const selectedMeta = document.querySelector("#selectedMeta");

const width = 1400;
const height = 1000;
const globe = { cx: 705, cy: 540, r: 455 };
let selectedIso = "";
let countries = [];
let countryLayer;
let labelLayer;

const formatRate = d3.format(".1f");
const exactRate = d3.format(".2f");

const thresholds = [1, 1.5, 2.1, 3, 4, 5];
const colors = ["#8f1d22", "#c43d3d", "#ee7466", "#b9e081", "#74b65a", "#2f8f48", "#0d6439"];
const colorScale = d3.scaleThreshold(thresholds, colors);

const importantLabels = new Set([
  "USA",
  "CAN",
  "MEX",
  "BRA",
  "ARG",
  "CHL",
  "RUS",
  "CHN",
  "IND",
  "IDN",
  "PAK",
  "IRN",
  "TUR",
  "SAU",
  "EGY",
  "DZA",
  "ETH",
  "NGA",
  "COD",
  "ZAF",
  "AUS",
  "KAZ",
  "MNG",
  "JPN",
  "KOR",
  "VNM",
  "THA",
  "MMR",
]);

const nameShortcuts = new Map([
  ["United States of America", "U.S."],
  ["United Kingdom", "UK"],
  ["Russian Federation", "Russia"],
  ["Congo, Dem. Rep.", "DR Congo"],
  ["Congo, Rep.", "Congo"],
  ["Korea, Rep.", "S. Korea"],
  ["Korea, Dem. People's Rep.", "N. Korea"],
  ["Egypt, Arab Rep.", "Egypt"],
  ["Iran, Islamic Rep.", "Iran"],
  ["Venezuela, RB", "Venezuela"],
  ["Yemen, Rep.", "Yemen"],
  ["Syrian Arab Republic", "Syria"],
  ["Lao PDR", "Laos"],
  ["Viet Nam", "Vietnam"],
  ["Slovak Republic", "Slovakia"],
  ["Czechia", "Czechia"],
]);

const lensDefinitions = [
  {
    id: "europe",
    title: "Europe",
    cx: 682,
    cy: 326,
    r: 118,
    center: [13, 53],
    scale: 205,
    isos: [
      "ISL",
      "IRL",
      "GBR",
      "PRT",
      "ESP",
      "FRA",
      "BEL",
      "NLD",
      "DEU",
      "CHE",
      "ITA",
      "AUT",
      "CZE",
      "POL",
      "DNK",
      "SWE",
      "NOR",
      "FIN",
      "EST",
      "LVA",
      "LTU",
      "UKR",
      "BLR",
      "MDA",
      "ROU",
      "BGR",
      "GRC",
      "ALB",
      "SRB",
      "BIH",
      "HRV",
      "SVN",
      "HUN",
      "SVK",
      "MKD",
      "MNE",
      "LUX",
    ],
    labelIsos: [
      "ISL",
      "IRL",
      "GBR",
      "PRT",
      "ESP",
      "FRA",
      "BEL",
      "NLD",
      "DEU",
      "CHE",
      "ITA",
      "AUT",
      "DNK",
      "SWE",
      "NOR",
      "FIN",
      "EST",
      "LVA",
      "LTU",
      "POL",
      "UKR",
      "ROU",
      "GRC",
    ],
  },
  {
    id: "caribbean",
    title: "Caribbean",
    cx: 316,
    cy: 618,
    r: 88,
    center: [-78, 18],
    scale: 292,
    isos: [
      "MEX",
      "CUB",
      "DOM",
      "HTI",
      "JAM",
      "BHS",
      "BLZ",
      "GTM",
      "HND",
      "SLV",
      "NIC",
      "CRI",
      "PAN",
      "COL",
      "VEN",
      "TTO",
      "GUY",
      "SUR",
    ],
    labelIsos: ["MEX", "CUB", "DOM", "HTI", "JAM", "GTM", "HND", "NIC", "CRI", "PAN", "COL", "VEN"],
  },
  {
    id: "seasia",
    title: "SE Asia",
    cx: 1108,
    cy: 662,
    r: 100,
    center: [116, 6],
    scale: 205,
    isos: [
      "SGP",
      "MYS",
      "IDN",
      "BRN",
      "PHL",
      "VNM",
      "KHM",
      "LAO",
      "THA",
      "MMR",
      "TLS",
      "PNG",
      "AUS",
      "NZL",
      "FJI",
      "SLB",
      "VUT",
    ],
    labelIsos: ["SGP", "MYS", "IDN", "PHL", "VNM", "THA", "MMR", "KHM", "LAO", "PNG", "AUS", "NZL"],
  },
];

const lensLabelIsos = new Set(lensDefinitions.flatMap((lens) => lens.isos));

init().catch((error) => {
  console.error(error);
  selectedName.textContent = "Could not load map";
  selectedValue.textContent = "--";
  selectedMeta.textContent = "Check the local data files.";
});

async function init() {
  const [world, fertilityData] = await Promise.all([
    fetch("data/world.geojson").then((response) => response.json()),
    fetch("data/fertility.json").then((response) => response.json()),
  ]);

  const fertilityByIso = new Map(fertilityData.countries.map((row) => [row.iso3, row]));

  countries = world.features
    .map((feature) => {
      const iso3 = feature.properties["ISO3166-1-Alpha-3"];
      const rateRow = fertilityByIso.get(iso3);
      const sourceName = rateRow?.name || feature.properties.name;
      return {
        ...feature,
        iso3,
        rate: rateRow?.fertility ?? null,
        year: rateRow?.year ?? null,
        displayName: nameShortcuts.get(sourceName) || nameShortcuts.get(feature.properties.name) || sourceName,
        fullName: sourceName,
      };
    })
    .filter((feature) => feature.iso3 && feature.iso3 !== "-99" && !["ATA", "GRL"].includes(feature.iso3));

  setupDefinitions();
  renderBaseMap();
  renderLegend();
  renderCallout();
  renderLenses();
  populateCountrySelect();
  bindControls();
  updateLabels(false);
}

function setupDefinitions() {
  const defs = svg.append("defs");
  defs
    .append("clipPath")
    .attr("id", "globeClip")
    .append("circle")
    .attr("cx", globe.cx)
    .attr("cy", globe.cy)
    .attr("r", globe.r);

  lensDefinitions.forEach((lens) => {
    defs
      .append("clipPath")
      .attr("id", `${lens.id}Clip`)
      .append("circle")
      .attr("cx", lens.cx)
      .attr("cy", lens.cy)
      .attr("r", lens.r - 4);
  });
}

function renderBaseMap() {
  const projection = d3
    .geoNaturalEarth1()
    .fitExtent(
      [
        [globe.cx - globe.r * 1.18, globe.cy - globe.r * 0.83],
        [globe.cx + globe.r * 1.18, globe.cy + globe.r * 0.83],
      ],
      { type: "Sphere" },
    );
  projection.scale(projection.scale() * 1.16);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();

  svg
    .append("circle")
    .attr("class", "sphere")
    .attr("cx", globe.cx)
    .attr("cy", globe.cy)
    .attr("r", globe.r);

  svg
    .append("path")
    .datum(graticule)
    .attr("class", "water-shade")
    .attr("clip-path", "url(#globeClip)")
    .attr("d", path);

  countryLayer = svg.append("g").attr("clip-path", "url(#globeClip)");

  countryLayer
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("class", (d) => `country ${d.rate == null ? "no-data" : ""}`)
    .attr("d", path)
    .attr("fill", fillForCountry)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", countryAriaLabel)
    .on("mousemove", showTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => selectCountry(d.iso3))
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCountry(d.iso3);
      }
    });

  countries.forEach((feature) => {
    const bounds = path.bounds(feature);
    feature.screenArea = Math.max(0, bounds[1][0] - bounds[0][0]) * Math.max(0, bounds[1][1] - bounds[0][1]);
    feature.centroid = path.centroid(feature);
  });

  labelLayer = svg.append("g").attr("clip-path", "url(#globeClip)");
}

function renderLegend() {
  const arcBreaks = [0, 1, 1.5, 2.1, 3, 4, 5, 6.2];
  const arcScale = d3.scaleLinear().domain([0, 6.2]).range([-1.26, 1.26]);
  const arc = d3
    .arc()
    .innerRadius(globe.r + 9)
    .outerRadius(globe.r + 39);
  const legend = svg.append("g").attr("transform", `translate(${globe.cx},${globe.cy})`);

  legend
    .selectAll("path")
    .data(d3.pairs(arcBreaks))
    .join("path")
    .attr("d", ([start, end]) => arc({ startAngle: arcScale(start), endAngle: arcScale(end) }))
    .attr("fill", ([start, end]) => colorScale((start + end) / 2))
    .attr("stroke", "rgba(255,255,255,0.58)")
    .attr("stroke-width", 2);

  const ticks = [0, 1, 1.5, 2.1, 3, 4, 5];
  legend
    .selectAll(".legend-tick")
    .data(ticks)
    .join("text")
    .attr("class", "legend-tick")
    .attr("x", (d) => Math.sin(arcScale(d)) * (globe.r + 57))
    .attr("y", (d) => -Math.cos(arcScale(d)) * (globe.r + 57) + 4)
    .text((d) => d);

  const replacementAngle = arcScale(2.1);
  const pillX = globe.cx + Math.sin(replacementAngle) * (globe.r + 96);
  const pillY = globe.cy - Math.cos(replacementAngle) * (globe.r + 96);
  svg
    .append("line")
    .attr("x1", globe.cx + Math.sin(replacementAngle) * (globe.r + 39))
    .attr("y1", globe.cy - Math.cos(replacementAngle) * (globe.r + 39))
    .attr("x2", pillX - 8)
    .attr("y2", pillY + 18)
    .attr("stroke", "#2f8f48")
    .attr("stroke-width", 3);
  svg
    .append("rect")
    .attr("class", "replacement-pill")
    .attr("x", pillX - 86)
    .attr("y", pillY - 21)
    .attr("width", 160)
    .attr("height", 34)
    .attr("rx", 7);
  svg
    .append("text")
    .attr("class", "replacement-text")
    .attr("x", pillX - 6)
    .attr("y", pillY + 2)
    .text("Replacement 2.1");
}

function renderCallout() {
  const withData = countries.filter((country) => country.rate != null);
  const below = withData.filter((country) => country.rate < 2.1);
  const percent = Math.round((below.length / withData.length) * 100);

  const callout = svg.append("g").attr("transform", "translate(948,168)");
  callout
    .append("path")
    .attr("class", "callout")
    .attr(
      "d",
      "M0,0H250C276,0 292,18 292,43V142C292,171 271,188 245,188H52L-16,236L10,168C3,160 0,149 0,134V0Z",
    );
  const lines = [
    `${percent}% of mapped countries`,
    "are below 2.1 births",
    "per woman, the usual",
    "replacement-rate marker",
    "without immigration.",
  ];

  callout
    .append("text")
    .attr("class", "callout-text")
    .attr("x", 24)
    .attr("y", 42)
    .selectAll("tspan")
    .data(lines)
    .join("tspan")
    .attr("x", 24)
    .attr("dy", (_, index) => (index === 0 ? 0 : 29))
    .text((d) => d);
}

function renderLenses() {
  const byIso = new Map(countries.map((country) => [country.iso3, country]));

  lensDefinitions.forEach((lens) => {
    const lensCountries = lens.isos.map((iso) => byIso.get(iso)).filter(Boolean);
    const projection = d3
      .geoMercator()
      .center(lens.center)
      .scale(lens.scale)
      .translate([lens.cx, lens.cy]);
    const path = d3.geoPath(projection);

    const group = svg.append("g").attr("class", "lens");

    group
      .append("circle")
      .attr("class", "lens-rim")
      .attr("cx", lens.cx)
      .attr("cy", lens.cy)
      .attr("r", lens.r);
    group
      .append("circle")
      .attr("class", "sphere")
      .attr("cx", lens.cx)
      .attr("cy", lens.cy)
      .attr("r", lens.r - 4)
      .attr("opacity", 0.98);

    const clipped = group.append("g").attr("clip-path", `url(#${lens.id}Clip)`);
    clipped
      .selectAll("path")
      .data(lensCountries)
      .join("path")
      .attr("class", "lens-country")
      .attr("d", path)
      .attr("fill", fillForCountry)
      .on("mousemove", showTooltip)
      .on("mouseleave", hideTooltip)
      .on("click", (_, d) => selectCountry(d.iso3));

    const lensLabelSet = new Set(lens.labelIsos || lens.isos);
    const labelData = avoidLabelCollisions(
      lensCountries
      .filter((country) => country.rate != null)
      .filter((country) => lensLabelSet.has(country.iso3))
      .map((country) => ({ ...country, lensCentroid: path.centroid(country) }))
      .filter((country) => {
        const [x, y] = country.lensCentroid;
        return Math.hypot(x - lens.cx, y - lens.cy) < lens.r - 18;
      }),
    );

    group
      .selectAll(`.${lens.id}-label`)
      .data(labelData)
      .join("text")
      .attr("class", "lens-label")
      .attr("x", (d) => d.lensCentroid[0])
      .attr("y", (d) => d.lensCentroid[1])
      .each(function appendLabel(d) {
        const text = d3.select(this);
        const label = lensCountryLabel(d);
        text.append("tspan").attr("x", d.lensCentroid[0]).attr("dy", 0).text(label);
        text.append("tspan").attr("x", d.lensCentroid[0]).attr("dy", 13).text(formatRate(d.rate));
      });

    group
      .append("text")
      .attr("class", "lens-title")
      .attr("x", lens.cx)
      .attr("y", lens.cy - lens.r - 12)
      .text(lens.title);
  });
}

function populateCountrySelect() {
  const options = countries
    .filter((country) => country.rate != null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  options.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.iso3;
    option.textContent = `${country.fullName} (${formatRate(country.rate)})`;
    select.appendChild(option);
  });
}

function bindControls() {
  select.addEventListener("change", () => selectCountry(select.value));
  labelToggle.addEventListener("change", () => updateLabels(labelToggle.checked));
}

function updateLabels(showMore) {
  const maxLabels = showMore ? 150 : 58;
  const minArea = showMore ? 420 : 2300;
  const labelData = countries
    .filter((country) => country.rate != null)
    .filter((country) => {
      if (!Number.isFinite(country.centroid?.[0])) return false;
      if (lensLabelIsos.has(country.iso3) && !importantLabels.has(country.iso3)) return false;
      return country.screenArea > minArea || importantLabels.has(country.iso3) || country.iso3 === selectedIso;
    })
    .sort((a, b) => b.screenArea - a.screenArea)
    .slice(0, maxLabels);

  labelLayer.selectAll("text").remove();

  const labels = labelLayer
    .selectAll("text")
    .data(labelData, (d) => d.iso3)
    .join("text")
    .attr("class", "country-label")
    .attr("x", (d) => d.centroid[0])
    .attr("y", (d) => d.centroid[1])
    .attr("opacity", (d) => (selectedIso && d.iso3 !== selectedIso ? 0.58 : 1));

  labels.each(function appendCountryLabel(d) {
    const text = d3.select(this);
    text.append("tspan").attr("x", d.centroid[0]).attr("dy", 0).text(shortCountryLabel(d));
    text.append("tspan").attr("class", "rate").attr("x", d.centroid[0]).attr("dy", 16).text(formatRate(d.rate));
  });
}

function selectCountry(iso3) {
  selectedIso = iso3 || "";
  select.value = selectedIso;

  countryLayer
    .selectAll(".country")
    .classed("is-selected", (d) => d.iso3 === selectedIso)
    .classed("is-muted", (d) => selectedIso && d.iso3 !== selectedIso);

  updateLabels(labelToggle.checked);

  const country = countries.find((item) => item.iso3 === selectedIso);
  if (!country) {
    selectedName.textContent = "World overview";
    selectedValue.textContent = "2.1";
    selectedMeta.textContent = "Replacement rate reference";
    return;
  }

  selectedName.textContent = country.fullName;
  selectedValue.textContent = country.rate == null ? "--" : exactRate(country.rate);
  selectedMeta.textContent =
    country.rate == null ? "No World Bank value in local dataset" : `${country.year} total fertility rate`;
}

function showTooltip(event, d) {
  const bounds = document.querySelector(".map-frame").getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const valueText = d.rate == null ? "No value" : `${exactRate(d.rate)} births per woman`;
  const yearText = d.year ? `${d.year} latest available` : "No year";

  tooltip
    .html(`<strong>${d.fullName}</strong><span>${valueText}<br>${yearText}</span>`)
    .style("left", `${Math.min(x + 14, bounds.width - 250)}px`)
    .style("top", `${Math.max(12, y - 56)}px`)
    .attr("hidden", null);
}

function hideTooltip() {
  tooltip.attr("hidden", true);
}

function fillForCountry(country) {
  return country.rate == null ? "#c8ced1" : colorScale(country.rate);
}

function countryAriaLabel(country) {
  if (country.rate == null) {
    return `${country.fullName}, no fertility rate available`;
  }
  return `${country.fullName}, fertility rate ${exactRate(country.rate)} births per woman in ${country.year}`;
}

function shortCountryLabel(country) {
  const preferred = country.displayName || country.fullName;
  const compact = new Map([
    ["United States of America", "U.S."],
    ["Dominican Republic", "DOM"],
    ["Bosnia and Herzegovina", "BIH"],
    ["North Macedonia", "MKD"],
    ["United Kingdom", "UK"],
    ["Netherlands", "NLD"],
    ["Switzerland", "CHE"],
    ["Singapore", "SGP"],
    ["Papua New Guinea", "PNG"],
  ]);

  return compact.get(preferred) || compact.get(country.fullName) || preferred.replace("Democratic Republic of the ", "DR ");
}

function lensCountryLabel(country) {
  const codes = new Map([
    ["AUS", "AUS"],
    ["AUT", "AUT"],
    ["BEL", "BEL"],
    ["CHE", "CHE"],
    ["COL", "COL"],
    ["CRI", "CRI"],
    ["CUB", "Cuba"],
    ["DEU", "DEU"],
    ["DNK", "DNK"],
    ["DOM", "DOM"],
    ["ESP", "Spain"],
    ["EST", "EST"],
    ["FIN", "FIN"],
    ["FRA", "FRA"],
    ["GBR", "UK"],
    ["GRC", "GRC"],
    ["GTM", "GTM"],
    ["HND", "HND"],
    ["HTI", "HTI"],
    ["IDN", "IDN"],
    ["IRL", "IRL"],
    ["ISL", "ISL"],
    ["ITA", "Italy"],
    ["JAM", "JAM"],
    ["KHM", "KHM"],
    ["LAO", "LAO"],
    ["LTU", "LTU"],
    ["LVA", "LVA"],
    ["MEX", "Mexico"],
    ["MMR", "MMR"],
    ["MYS", "MYS"],
    ["NIC", "NIC"],
    ["NLD", "NLD"],
    ["NOR", "NOR"],
    ["NZL", "NZ"],
    ["PAN", "PAN"],
    ["PHL", "PHL"],
    ["PNG", "PNG"],
    ["POL", "POL"],
    ["PRT", "PRT"],
    ["ROU", "ROU"],
    ["SGP", "SGP"],
    ["SWE", "SWE"],
    ["THA", "THA"],
    ["UKR", "UKR"],
    ["VEN", "VEN"],
    ["VNM", "VNM"],
  ]);

  return codes.get(country.iso3) || shortCountryLabel(country);
}

function avoidLabelCollisions(items) {
  const accepted = [];
  const sorted = [...items].sort((a, b) => b.screenArea - a.screenArea);

  sorted.forEach((item) => {
    const [x, y] = item.lensCentroid;
    const label = lensCountryLabel(item);
    const widthEstimate = Math.max(24, label.length * 7);
    const box = {
      left: x - widthEstimate / 2,
      right: x + widthEstimate / 2,
      top: y - 12,
      bottom: y + 20,
    };

    const overlaps = accepted.some(({ labelBox }) => {
      return !(box.right < labelBox.left || box.left > labelBox.right || box.bottom < labelBox.top || box.top > labelBox.bottom);
    });

    if (!overlaps) {
      accepted.push({ ...item, labelBox: box });
    }
  });

  return accepted;
}
