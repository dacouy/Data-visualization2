(() => {
const PYRAMID_URL = "data/part6/population_pyramid_annual_2024_2071.csv";
const MALE_COLOR = "#1A3A5C";
const FEMALE_COLOR = "#8B1A1A";
const UNDER65_GREY = "#C2BAAE";
const OLDER_AGES = new Set(["65-69", "70-74", "75-79", "80-84", "85+"]);
const GRID_COLOR = "#D8CFC0";
const INK_COLOR = "#1C1C1C";
const MUTED_COLOR = "#6F6255";

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

function formatPopulation(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return `${Math.round(value / 1_000)}K`;
}

function formatShare(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function enrichRows(rows) {
  return rows.map((row) => {
    const population = Number(row.population);
    const ageStart = Number(row.age_start);
    return {
      year: Number(row.year),
      age_group: row.age_group,
      age_start: ageStart,
      age_sort: 100 - ageStart,
      sex: row.sex,
      signed_population: row.sex === "Male" ? -population : population,
      population,
      older: ageStart >= 65 ? "65+" : "Under 65",
      opacity: ageStart >= 65 ? 0.92 : 0.72,
    };
  });
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
    oldest,
  };
}

function buildPyramidSpec(rows, currentYear, chartWidth = 760) {
  const currentRows = rows.filter((row) => row.year === currentYear);
  const ageOrder = [...new Map(rows.map((row) => [row.age_group, row.age_start]))]
    .map(([age_group, age_start]) => ({ age_group, age_start }))
    .sort((a, b) => b.age_start - a.age_start)
    .map((row) => row.age_group);
  const maxPopulation = Math.ceil(Math.max(...rows.map((row) => row.population)) / 250000) * 250000;

  const olderAges = ageOrder.filter((age) => OLDER_AGES.has(age));

  const yEncoding = {
    field: "age_group",
    type: "ordinal",
    sort: ageOrder,
    axis: {
      title: "Age group",
      values: ageOrder,
      orient: "left",
      labelColor: "#4A4038",
      titleColor: "#4A4038",
      labelFontSize: 15,
      titleFontSize: 16,
      labelPadding: 8,
      titlePadding: 14,
      labelLimit: 80,
      minExtent: 58,
      domain: false,
      tickColor: GRID_COLOR,
    },
  };

  const xScale = { domain: [-maxPopulation, maxPopulation] };

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: chartWidth,
    height: 320,
    padding: { left: 8, right: 56, top: 8, bottom: 8 },
    background: null,
    layer: [
      {
        data: { values: currentRows },
        mark: { type: "bar", cornerRadiusEnd: 2, stroke: "white", strokeWidth: 0.7 },
        encoding: {
          y: yEncoding,
          x: {
            field: "signed_population",
            type: "quantitative",
            scale: xScale,
            axis: {
              title: "Population per age group",
              labelExpr: "abs(datum.value) >= 1000000 ? format(abs(datum.value) / 1000000, '.2f') + 'M' : abs(datum.value) >= 1000 ? format(abs(datum.value) / 1000, '.0f') + 'K' : abs(datum.value)",
              values: [-maxPopulation, -1000000, -500000, 0, 500000, 1000000, maxPopulation],
              labelColor: MUTED_COLOR,
              titleColor: MUTED_COLOR,
              labelFontSize: 15,
              titleFontSize: 16,
              gridColor: GRID_COLOR,
              gridOpacity: 0.45,
              domainColor: GRID_COLOR,
              tickColor: GRID_COLOR,
            },
          },
          color: {
            condition: { test: "datum.older !== '65+'", value: UNDER65_GREY },
            field: "sex",
            type: "nominal",
            scale: { domain: ["Male", "Female"], range: [MALE_COLOR, FEMALE_COLOR] },
            legend: {
              orient: "top",
              direction: "horizontal",
              title: null,
              labelFont: "Times New Roman",
              labelFontSize: 14,
              labelColor: MUTED_COLOR,
              symbolType: "square",
            },
          },
          tooltip: [
            { field: "year", type: "ordinal", title: "Year" },
            { field: "sex", type: "nominal", title: "Sex" },
            { field: "age_group", type: "nominal", title: "Age group" },
            { field: "population", type: "quantitative", title: "Population", format: ",.0f" },
          ],
        },
      },
      {
        // Red zone wash over the 65+ bands (one rect per older band so each band is
        // fully covered). Drawn after the bars so the shared y-axis from the bar layer
        // is kept.
        data: { values: olderAges.map((age) => ({ age_group: age })) },
        mark: { type: "rect", fill: "#8B1A1A", fillOpacity: 0.09 },
        encoding: {
          y: { field: "age_group", type: "ordinal", sort: ageOrder },
          x: { datum: -maxPopulation, type: "quantitative", scale: xScale },
          x2: { datum: maxPopulation },
        },
      },
      {
        // "65+" zone annotation in the open space to the right of the older bars.
        data: { values: [{ age_group: olderAges[Math.floor(olderAges.length / 2)], label: "65+" }] },
        mark: {
          type: "text",
          align: "right",
          baseline: "middle",
          dx: -4,
          font: "Times New Roman",
          fontSize: 22,
          fontWeight: "bold",
          color: FEMALE_COLOR,
        },
        encoding: {
          y: { field: "age_group", type: "ordinal", sort: ageOrder },
          x: { datum: maxPopulation, type: "quantitative", scale: xScale },
          text: { field: "label" },
        },
      },
    ],
    config: {
      font: "Times New Roman",
      axis: {
        labelFont: "Times New Roman",
        titleFont: "Times New Roman",
      },
      view: { stroke: null },
    },
  };
}

function buildControls(container, minYear, maxYear) {
  const controls = document.createElement("div");
  controls.className = "pyramid-controls";
  controls.innerHTML = `
    <button type="button" class="pyramid-play-button" aria-label="Play population pyramid animation">Play</button>
    <p class="pyramid-play-hint">Press Play to animate Australia’s age structure from ${minYear} to ${maxYear}.</p>
    <div class="pyramid-slider-wrap">
      <input class="pyramid-year-slider" type="range" min="${minYear}" max="${maxYear}" step="1" value="${minYear}" aria-label="Population pyramid year">
      <div class="pyramid-year-ticks">
        <span>${minYear}</span>
        <span>${minYear + 16}</span>
        <span>${minYear + 31}</span>
        <span>${maxYear}</span>
      </div>
    </div>
  `;
  container.appendChild(controls);
  return controls;
}

function buildStatus(container) {
  const status = document.createElement("div");
  status.className = "pyramid-status";
  status.innerHTML = `
    <div class="pyramid-status-year"></div>
    <div class="pyramid-status-total"></div>
    <div class="pyramid-stat-stack">
      <div class="pyramid-stat-card"><strong>65+</strong><span data-stat="older"></span><em>older share</em></div>
      <div class="pyramid-stat-card"><strong>85+</strong><span data-stat="oldest"></span><em>people</em></div>
      <div class="pyramid-stat-card"><strong>0-14</strong><span data-stat="children"></span><em>children share</em></div>
    </div>
  `;
  container.appendChild(status);
  return status;
}

async function renderPopulationPyramid() {
  const container = document.querySelector("#population-pyramid-chart");
  let stage = "start";

  try {
    stage = "fetch";
    const response = await fetch(PYRAMID_URL);
    if (!response.ok) throw new Error("Could not load population pyramid CSV.");
    stage = "parse";
    const rows = enrichRows(parseCsv(await response.text()));
    const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    if (rows.length < 1000 || minYear !== 2024 || maxYear !== 2071) {
      throw new Error(`Only ${rows.length} annual pyramid rows available.`);
    }

    stage = "build-dom";
    container.innerHTML = "";
    const controls = buildControls(container, minYear, maxYear);
    const status = buildStatus(container);
    const chart = document.createElement("div");
    chart.className = "pyramid-vega-chart";
    container.appendChild(chart);

    const summaries = new Map(years.map((year) => [year, summarize(rows, year)]));
    const playButton = controls.querySelector(".pyramid-play-button");
    const slider = controls.querySelector(".pyramid-year-slider");
    let currentYear = minYear;
    let timer = null;
    let renderToken = 0;

    function updateStatus(year) {
      stage = "update-status";
      const summary = summaries.get(Number(year));
      status.querySelector(".pyramid-status-year").textContent = String(year);
      status.querySelector(".pyramid-status-total").textContent = `${formatPopulation(summary.total)} people`;
      status.querySelector('[data-stat="older"]').textContent = formatShare(summary.olderShare);
      status.querySelector('[data-stat="oldest"]').textContent = formatPopulation(summary.oldest);
      status.querySelector('[data-stat="children"]').textContent = formatShare(summary.childrenShare);
    }

    async function setYear(year) {
      stage = "set-year";
      currentYear = Number(year);
      slider.value = String(currentYear);
      updateStatus(currentYear);
      stage = "vega-embed";
      const token = (renderToken += 1);
      const chartWidth = Math.min(820, Math.max(560, Math.floor(chart.getBoundingClientRect().width || 760)));
      await vegaEmbed(chart, buildPyramidSpec(rows, currentYear, chartWidth), { actions: false, renderer: "svg" });
      if (token !== renderToken) return;
    }

    function stopAnimation() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      playButton.textContent = "Play";
      playButton.setAttribute("aria-label", "Play population pyramid animation");
    }

    function startAnimation() {
      if (currentYear >= maxYear) {
        setYear(minYear);
      }
      playButton.textContent = "Pause";
      playButton.setAttribute("aria-label", "Pause population pyramid animation");
      timer = window.setInterval(() => {
        if (currentYear >= maxYear) {
          stopAnimation();
          return;
        }
        setYear(currentYear + 1);
      }, 110);
    }

    playButton.addEventListener("click", () => {
      if (timer) stopAnimation();
      else startAnimation();
    });

    slider.addEventListener("input", () => {
      stopAnimation();
      setYear(slider.value);
    });

    await setYear(currentYear);

    const source = document.createElement("p");
    source.className = "pyramid-source";
    source.textContent = "Source: ABS 3222.0 Population Projections, Australia, medium series.";
    container.appendChild(source);
  } catch (error) {
    console.error(`Population pyramid failed at ${stage}:`, error.stack || error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load population pyramid at ${stage}: ${error.message}</p>`;
    }
  }
}

renderPopulationPyramid();
})();
