(() => {
const GAP_URL = "data/part7/replacement_gap_2054.csv";
const UNIT_VALUE = 100000;

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
  return `${(value / 1_000_000).toFixed(1)}M`;
}

function drawReplacementGap(rows) {
  const container = document.querySelector("#replacement-gap-waffle");
  if (!container) return;
  container.innerHTML = "";

  const high = rows.find((row) => row.scenario === "high");
  const medium = rows.find((row) => row.scenario === "medium");
  const gap = rows.find((row) => row.scenario === "high_medium_gap");
  if (!high || !medium || !gap) {
    throw new Error("Replacement gap CSV is missing high, medium or gap rows.");
  }

  const gapPeople = Number(gap.population);
  const mediumPeople = Number(medium.population);
  const highPeople = Number(high.population);
  const mediumUnits = Math.round(mediumPeople / UNIT_VALUE);
  const highUnits = Math.round(highPeople / UNIT_VALUE);
  const gapUnits = highUnits - mediumUnits;
  const squares = Array.from({ length: highUnits }, (_, index) => (
    `<span class="waffle-square ${index >= mediumUnits ? "waffle-square--extra" : ""}" title="${index < mediumUnits ? "Medium path" : "Additional in stronger path"}: 100,000 people"></span>`
  )).join("");

  container.innerHTML = `
    <div class="replacement-gap-layout">
      <div class="replacement-left">
        <div class="replacement-stat replacement-stat--need">
          <div class="replacement-label">Replacement rate needed:</div>
          <div class="replacement-number">2.1</div>
          <div class="replacement-unit">births per woman</div>
        </div>

        <div class="replacement-shortfall">
          <div class="replacement-shortfall-label">Shortfall</div>
          <div class="replacement-shortfall-value">0.62 births</div>
        </div>

        <div class="replacement-stat replacement-stat--today">
          <div class="replacement-label">Australia today:</div>
          <div class="replacement-number">1.48</div>
          <div class="replacement-unit">births per woman</div>
        </div>
      </div>

      <div class="replacement-right">
        <div class="waffle-heading">
          <div class="waffle-big">${formatPopulation(gapPeople)}</div>
          <div class="waffle-heading-copy">
            <strong>people not reached under the medium fertility path</strong>
            <span>Red squares show the medium 2054 population.</span>
            <span>Grey squares are the extra population in the stronger fertility path.</span>
          </div>
        </div>

        <div class="waffle-grid" aria-label="${mediumUnits} red medium-path squares plus ${gapUnits} grey stronger-path squares. Each square represents 100,000 people.">
          ${squares}
        </div>

        <div class="waffle-legend">
          <div class="projection-legend">
            <div class="projection-item projection-item--medium">
              <span></span>
              <strong>Medium fertility path</strong>
              <em>${formatPopulation(mediumPeople)} people</em>
            </div>
            <div class="projection-item projection-item--extra">
              <span></span>
              <strong>Extra under stronger fertility</strong>
              <em>+${formatPopulation(gapPeople)} people</em>
            </div>
          </div>
          <span class="waffle-square waffle-square--legend"></span>
          <span>1 square = 100,000 people</span>
        </div>
      </div>
    </div>
    <p class="waffle-source">Source: ABS 3222.0 Population Projections, Australia. Red shows the medium 2054 projection; grey shows the additional high-minus-medium projection gap. ABS scenarios also include migration and mortality assumptions.</p>
  `;
}

async function renderReplacementGap() {
  const container = document.querySelector("#replacement-gap-waffle");

  try {
    const response = await fetch(GAP_URL);
    if (!response.ok) {
      throw new Error("Could not load replacement gap CSV.");
    }
    drawReplacementGap(parseCsv(await response.text()));
  } catch (error) {
    console.error("Replacement gap failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load replacement gap: ${error.message}</p>`;
    }
  }
}

renderReplacementGap();
})();
