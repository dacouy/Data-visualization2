(() => {
const PYRAMID_URL = "data/part6/population_pyramid_2024_2054.csv";
const PYRAMID_FONT = "Times New Roman";
const MALE_COLOR = "#1A3A5C";
const FEMALE_COLOR = "#8B1A1A";
const AGE_BAND_COLOR = "#EAD2CD";
const GRID_COLOR = "#D8CFC0";

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ""));

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function appendText(svg, text, x, y, attrs = {}) {
  const element = createSvgElement("text", {
    x,
    y,
    "font-family": PYRAMID_FONT,
    ...attrs,
  });
  element.textContent = text;
  svg.appendChild(element);
  return element;
}

function formatPopulation(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return `${Math.round(value / 1_000)}K`;
}

function formatShare(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function enrichRows(rows) {
  return rows.map((row) => ({
    year: Number(row.year),
    age_group: row.age_group,
    age_start: Number(row.age_start),
    sex: row.sex,
    population: Number(row.population),
  }));
}

function summarize(rows, year) {
  const yearRows = rows.filter((row) => row.year === year);
  const total = yearRows.reduce((sum, row) => sum + row.population, 0);
  const children = yearRows
    .filter((row) => row.age_start <= 10)
    .reduce((sum, row) => sum + row.population, 0);
  const older = yearRows
    .filter((row) => row.age_start >= 65)
    .reduce((sum, row) => sum + row.population, 0);
  const oldest = yearRows
    .filter((row) => row.age_start >= 85)
    .reduce((sum, row) => sum + row.population, 0);

  return {
    total,
    childrenShare: children / total,
    olderShare: older / total,
    oldestShare: oldest / total,
  };
}

function drawPyramid(rows) {
  const container = document.querySelector("#population-pyramid-chart");
  if (!container) return;
  container.innerHTML = "";

  const width = 1000;
  const height = 660;
  const plotTop = 120;
  const plotBottom = 548;
  const panelWidth = 390;
  const panelGap = 100;
  const panelLeft = 42;
  const panelRight = panelLeft + panelWidth + panelGap;
  const centerLeft = panelLeft + panelWidth / 2;
  const centerRight = panelRight + panelWidth / 2;
  const sideWidth = 158;
  const barHeight = 17;
  const ageGroups = [...new Map(rows.map((row) => [row.age_group, row.age_start]))]
    .map(([age_group, age_start]) => ({ age_group, age_start }))
    .sort((a, b) => b.age_start - a.age_start);
  const maxPopulation = Math.ceil(Math.max(...rows.map((row) => row.population)) / 250000) * 250000;
  const yStep = (plotBottom - plotTop) / ageGroups.length;
  const xScale = (value) => (value / maxPopulation) * sideWidth;
  const rowByKey = new Map(rows.map((row) => [`${row.year}|${row.sex}|${row.age_group}`, row]));
  const summary2024 = summarize(rows, 2024);
  const summary2054 = summarize(rows, 2054);

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Population pyramids for Australia in 2024 and projected 2054",
  });
  container.appendChild(svg);

  appendText(svg, "The shape of an older Australia", 42, 34, {
    "font-size": 25,
    "font-weight": "bold",
    fill: "#1C1C1C",
  });
  appendText(svg, "Medium ABS projection. Bars show population by sex and five-year age group.", 42, 58, {
    "font-size": 14,
    fill: "#4A4038",
  });

  const statCardWidth = 112;
  const statCardGap = 20;
  const statGroupX = panelRight + panelWidth - (statCardWidth * 3 + statCardGap * 2);
  drawStat(svg, statGroupX, 0, "65+", `${formatShare(summary2024.olderShare)} -> ${formatShare(summary2054.olderShare)}`, "larger older share");
  drawStat(svg, statGroupX + statCardWidth + statCardGap, 2, "85+", "0.59M -> 1.64M", "nearly triples");
  drawStat(svg, statGroupX + (statCardWidth + statCardGap) * 2, 2, "0-14", `${formatShare(summary2024.childrenShare)} -> ${formatShare(summary2054.childrenShare)}`, "share falls");

  drawPanel(svg, {
    year: 2024,
    title: "2024",
    subtitle: `${formatPopulation(summary2024.total)} people`,
    centerX: centerLeft,
    leftX: panelLeft,
    rightX: panelLeft + panelWidth,
    ageGroups,
    rowByKey,
    yStep,
    barHeight,
    xScale,
    maxPopulation,
    plotTop,
    plotBottom,
  });

  drawPanel(svg, {
    year: 2054,
    title: "2054 projected",
    subtitle: `${formatPopulation(summary2054.total)} people`,
    centerX: centerRight,
    leftX: panelRight,
    rightX: panelRight + panelWidth,
    ageGroups,
    rowByKey,
    yStep,
    barHeight,
    xScale,
    maxPopulation,
    plotTop,
    plotBottom,
  });

  const ageLabelX = (panelLeft + panelWidth + panelRight) / 2;
  ageGroups.forEach((age, index) => {
    const y = plotTop + index * yStep + yStep / 2 + 4;
    appendText(svg, age.age_group, ageLabelX, y, {
      "font-size": 11,
      fill: "#4A4038",
      "text-anchor": "middle",
    });
  });

  appendText(svg, "Age group", ageLabelX, plotTop - 16, {
    "font-size": 12,
    "font-weight": "bold",
    fill: "#4A4038",
    "text-anchor": "middle",
  });
  appendText(svg, "Source: ABS 3222.0 Population Projections, Australia, medium series.", 42, height - 22, {
    "font-size": 11,
    fill: "#6F6255",
  });

  const tooltip = document.createElement("div");
  tooltip.className = "pyramid-tooltip";
  container.appendChild(tooltip);

  svg.querySelectorAll("[data-pyramid-bar='true']").forEach((bar) => {
    bar.addEventListener("mouseenter", (event) => showTooltip(event, tooltip, bar));
    bar.addEventListener("mousemove", (event) => showTooltip(event, tooltip, bar));
    bar.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });
  });
}

function drawPanel(svg, config) {
  const {
    year,
    title,
    subtitle,
    centerX,
    leftX,
    rightX,
    ageGroups,
    rowByKey,
    yStep,
    barHeight,
    xScale,
    maxPopulation,
    plotTop,
    plotBottom,
  } = config;

  const ticks = [0, 500000, 1000000];

  appendText(svg, title, centerX, 92, {
    "font-size": 24,
    "font-weight": "bold",
    fill: year === 2054 ? FEMALE_COLOR : "#1C1C1C",
    "text-anchor": "middle",
  });
  appendText(svg, subtitle, centerX, 111, {
    "font-size": 13,
    fill: "#4A4038",
    "text-anchor": "middle",
  });
  appendText(svg, "Male", centerX - 98, plotTop - 16, {
    "font-size": 12,
    "font-weight": "bold",
    fill: MALE_COLOR,
    "text-anchor": "middle",
  });
  appendText(svg, "Female", centerX + 98, plotTop - 16, {
    "font-size": 12,
    "font-weight": "bold",
    fill: FEMALE_COLOR,
    "text-anchor": "middle",
  });

  svg.appendChild(
    createSvgElement("rect", {
      x: leftX,
      y: plotTop,
      width: rightX - leftX,
      height: plotBottom - plotTop,
      fill: "#FFFFFF",
    })
  );

  const olderStartIndex = ageGroups.findIndex((age) => age.age_start === 85);
  const olderEndIndex = ageGroups.findIndex((age) => age.age_start === 65);
  svg.appendChild(
    createSvgElement("rect", {
      x: leftX,
      y: plotTop + olderStartIndex * yStep,
      width: rightX - leftX,
      height: (olderEndIndex - olderStartIndex + 1) * yStep,
      fill: AGE_BAND_COLOR,
      opacity: year === 2054 ? 0.42 : 0.24,
    })
  );
  appendText(svg, "65+", rightX - 8, plotTop + olderEndIndex * yStep + yStep - 7, {
    "font-size": 12,
    "font-weight": "bold",
    fill: FEMALE_COLOR,
    "text-anchor": "end",
  });

  ticks.forEach((tick) => {
    const offset = xScale(tick);
    [centerX - offset, centerX + offset].forEach((x) => {
      svg.appendChild(
        createSvgElement("line", {
          x1: x,
          x2: x,
          y1: plotTop,
          y2: plotBottom,
          stroke: GRID_COLOR,
          "stroke-opacity": tick === 0 ? 0.95 : 0.35,
          "stroke-width": tick === 0 ? 1.2 : 1,
        })
      );
    });
    if (tick > 0) {
      appendText(svg, formatPopulation(tick), centerX - offset, plotBottom + 20, {
        "font-size": 10,
        fill: "#6F6255",
        "text-anchor": "middle",
      });
      appendText(svg, formatPopulation(tick), centerX + offset, plotBottom + 20, {
        "font-size": 10,
        fill: "#6F6255",
        "text-anchor": "middle",
      });
    }
  });

  ageGroups.forEach((age, index) => {
    const y = plotTop + index * yStep + (yStep - barHeight) / 2;
    const male = rowByKey.get(`${year}|Male|${age.age_group}`);
    const female = rowByKey.get(`${year}|Female|${age.age_group}`);
    drawBar(svg, {
      row: male,
      x: centerX - xScale(male.population),
      y,
      width: xScale(male.population),
      height: barHeight,
      fill: MALE_COLOR,
      older: age.age_start >= 65,
      year,
    });
    drawBar(svg, {
      row: female,
      x: centerX,
      y,
      width: xScale(female.population),
      height: barHeight,
      fill: FEMALE_COLOR,
      older: age.age_start >= 65,
      year,
    });
  });

  appendText(svg, "Population per age group", centerX, plotBottom + 44, {
    "font-size": 11,
    fill: "#6F6255",
    "text-anchor": "middle",
  });
  appendText(svg, `Scale max: ${formatPopulation(maxPopulation)}`, centerX, plotBottom + 60, {
    "font-size": 10,
    fill: "#6F6255",
    "text-anchor": "middle",
  });
}

function drawBar(svg, config) {
  const { row, x, y, width, height, fill, older, year } = config;
  const bar = createSvgElement("rect", {
    x,
    y,
    width,
    height,
    rx: 2,
    fill,
    opacity: older ? (year === 2054 ? 0.94 : 0.78) : (year === 2054 ? 0.76 : 0.62),
    stroke: older ? "#3A0D0D" : "#FFFFFF",
    "stroke-width": older ? 0.7 : 0.45,
    "data-pyramid-bar": "true",
    "data-year": row.year,
    "data-age": row.age_group,
    "data-sex": row.sex,
    "data-population": row.population,
  });
  svg.appendChild(bar);
}

function drawStat(svg, x, y, label, value, note) {
  svg.appendChild(
    createSvgElement("rect", {
      x,
      y,
      width: 112,
      height: 64,
      fill: "#FFFFFF",
      stroke: GRID_COLOR,
    })
  );
  appendText(svg, label, x + 10, y + 20, {
    "font-size": 13,
    "font-weight": "bold",
    fill: FEMALE_COLOR,
  });
  appendText(svg, value, x + 10, y + 40, {
    "font-size": 13,
    "font-weight": "bold",
    fill: "#1C1C1C",
  });
  appendText(svg, note, x + 10, y + 56, {
    "font-size": 10,
    fill: "#6F6255",
  });
}

function showTooltip(event, tooltip, bar) {
  const rect = tooltip.parentElement.getBoundingClientRect();
  tooltip.innerHTML = `
    <strong>${bar.dataset.year} - ${bar.dataset.age}</strong><br>
    ${bar.dataset.sex}: ${Number(bar.dataset.population).toLocaleString()} people
  `;
  tooltip.style.opacity = "1";
  tooltip.style.left = `${event.clientX - rect.left + 14}px`;
  tooltip.style.top = `${event.clientY - rect.top + 14}px`;
}

async function renderPopulationPyramid() {
  const container = document.querySelector("#population-pyramid-chart");

  try {
    const response = await fetch(PYRAMID_URL);
    if (!response.ok) {
      throw new Error("Could not load population pyramid CSV.");
    }
    const rows = enrichRows(parseCsv(await response.text()));
    if (rows.length < 60) {
      throw new Error(`Only ${rows.length} pyramid rows available.`);
    }
    drawPyramid(rows);
  } catch (error) {
    console.error("Population pyramid failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load population pyramid: ${error.message}</p>`;
    }
  }
}

renderPopulationPyramid();
})();
