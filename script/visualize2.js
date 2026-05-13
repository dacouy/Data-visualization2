const STATE_TFR_URL = "data/tfr_bystate.csv";
const CHART_BACKGROUND = "#FFFFFF";
const FONT = "Times New Roman";
const DUMBBELL_LINE_COLOR = "#d99a8b";
const NATIONAL_LINE_COLOR = "#7a4b3a";
const POINT_2014_COLOR = "#e0b23f";
const POINT_2024_COLOR = "#8B1A1A";
const CHANGE_LABEL_COLOR = "#6f3d2f";
const AVG_2014 = 1.795;
const AVG_2024 = 1.481;

function parseStateTfrCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => {
      const [state, year, tfr] = row.split(",");
      return {
        state,
        year: Number(year),
        tfr: Number(tfr),
      };
    });
}

function prepareDumbbellData(rows) {
  const byState = {};

  rows.forEach((row) => {
    if (!byState[row.state]) byState[row.state] = {};
    byState[row.state][row.year] = row.tfr;
  });

  const meta = Object.keys(byState).map((state) => {
    const tfr2014 = byState[state][2014];
    const tfr2024 = byState[state][2024];
    const delta = tfr2024 - tfr2014;
    const pctChange = ((tfr2024 - tfr2014) / tfr2014) * 100;

    return {
      state,
      tfr2014,
      tfr2024,
      delta,
      pctChange,
      isNational: state === "Aust.",
      changeLabel: `${pctChange.toFixed(1)}%`,
      tfr2014Label: tfr2014.toFixed(3),
      tfr2024Label: tfr2024.toFixed(3),
    };
  });

  const national = meta.find((d) => d.isNational);
  const jurisdictions = meta
    .filter((d) => !d.isNational)
    .sort((a, b) => a.pctChange - b.pctChange);

  const stateOrder = jurisdictions.map((d) => d.state);

  const segments = jurisdictions.map((d) => ({
    ...d,
  }));

  const points = segments.flatMap((d) => [
    {
      state: d.state,
      year: "2014",
      tfr: d.tfr2014,
      pctChange: d.pctChange,
      changeLabel: d.changeLabel,
    },
    {
      state: d.state,
      year: "2024",
      tfr: d.tfr2024,
      pctChange: d.pctChange,
      changeLabel: d.changeLabel,
    },
  ]);

  return { segments, points, national, stateOrder };
}

function buildDumbbellSpec({ segments, points, national, stateOrder }) {
  const tooltip = [
    { field: "state", type: "nominal", title: "State / territory" },
    { field: "tfr2014", type: "quantitative", title: "TFR 2014", format: ".3f" },
    { field: "tfr2024", type: "quantitative", title: "TFR 2024", format: ".3f" },
    { field: "pctChange", type: "quantitative", title: "Change vs 2014", format: ".1f" },
  ];

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 300,
    background: CHART_BACKGROUND,
    padding: { left: 28, right: 42, top: 38, bottom: 30 },
    title: {
      text: "Every jurisdiction moved lower",
      subtitle: "Total fertility rate by state and territory, 2014 vs 2024",
      anchor: "start",
      font: FONT,
      subtitleFont: FONT,
      fontSize: 28,
      subtitleFontSize: 15,
      color: "#1C1C1C",
      subtitleColor: "#6f6255",
      offset: 12,
    },
    layer: [
      {
        data: {
          values: [
            { x: AVG_2014, year: "2014" },
            { x: AVG_2024, year: "2024" },
          ],
        },
        mark: {
          type: "rule",
          stroke: NATIONAL_LINE_COLOR,
          strokeDash: [6, 5],
          strokeWidth: 1.4,
        },
        encoding: {
          x: { field: "x", type: "quantitative" },
        },
      },
      {
        data: {
          values: [
            {
              x: AVG_2014,
              state: stateOrder[0],
              label: `Aust. avg 2014: ${national.tfr2014.toFixed(3)}`,
            },
            {
              x: AVG_2024,
              state: stateOrder[0],
              label: `Aust. avg 2024: ${national.tfr2024.toFixed(3)}`,
            },
          ],
        },
        mark: {
          type: "text",
          align: "left",
          baseline: "bottom",
          dx: 8,
          dy: -18,
          font: FONT,
          fontSize: 12,
          fontWeight: "bold",
          color: NATIONAL_LINE_COLOR,
        },
        encoding: {
          x: { field: "x", type: "quantitative" },
          y: { field: "state", type: "nominal", sort: stateOrder },
          text: { field: "label" },
        },
      },
      {
        data: { values: segments },
        mark: {
          type: "rule",
          color: DUMBBELL_LINE_COLOR,
          strokeWidth: 6,
          opacity: 0.88,
        },
        encoding: {
          x: { field: "tfr2014", type: "quantitative" },
          x2: { field: "tfr2024" },
          y: {
            field: "state",
            type: "nominal",
            sort: stateOrder,
            axis: {
              title: null,
              labelFont: FONT,
              labelFontSize: 15,
              labelColor: "#1C1C1C",
              labelPadding: 7,
              ticks: false,
              domain: false,
            },
          },
          tooltip,
        },
      },
      {
        data: { values: points },
        mark: {
          type: "point",
          filled: true,
          size: 145,
          opacity: 1,
          stroke: "#5f2f24",
          strokeWidth: 1.2,
        },
        encoding: {
          x: {
            field: "tfr",
            type: "quantitative",
            scale: { domain: [1.2, 2.05], zero: false },
            axis: {
              title: "Children per woman",
              titleFont: FONT,
              labelFont: FONT,
              titleFontSize: 13,
              labelFontSize: 12,
              labelColor: "#6f6255",
              titleColor: "#6f6255",
              grid: true,
              gridColor: "#ece5dc",
              tickColor: "#cfc5b9",
              domainColor: "#cfc5b9",
            },
          },
          y: { field: "state", type: "nominal", sort: stateOrder },
          color: {
            field: "year",
            type: "nominal",
            scale: {
              domain: ["2014", "2024"],
              range: [POINT_2014_COLOR, POINT_2024_COLOR],
            },
            legend: null,
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State / territory" },
            { field: "year", type: "nominal", title: "Year" },
            { field: "tfr", type: "quantitative", title: "TFR", format: ".3f" },
            { field: "pctChange", type: "quantitative", title: "Change vs 2014", format: ".1f" },
          ],
        },
      },
      {
        data: { values: segments },
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 50,
          font: FONT,
          fontSize: 13,
          fontWeight: "bold",
          color: CHANGE_LABEL_COLOR,
        },
        encoding: {
          x: { datum: 2.05, type: "quantitative" },
          y: { field: "state", type: "nominal", sort: stateOrder },
          text: { field: "changeLabel" },
          tooltip,
        },
      },
      {
        data: {
          values: [
            { state: stateOrder[0], x: 2.05, label: "Change" },
          ],
        },
        mark: {
          type: "text",
          align: "left",
          baseline: "bottom",
          dx: 50,
          dy: -15,
          font: FONT,
          fontSize: 12,
          fontWeight: "bold",
          color: CHANGE_LABEL_COLOR,
        },
        encoding: {
          x: { field: "x", type: "quantitative" },
          y: { field: "state", type: "nominal", sort: stateOrder },
          text: { field: "label" },
        },
      },
    ],
    resolve: {
      scale: { color: "independent" },
    },
    config: {
      view: { stroke: null },
      axis: { labelFont: FONT, titleFont: FONT },
    },
  };
}

async function renderStateDumbbellChart() {
  const response = await fetch(STATE_TFR_URL);
  const csvText = await response.text();
  const rows = parseStateTfrCsv(csvText);
  const data = prepareDumbbellData(rows);

  vegaEmbed("#state-slope-chart", buildDumbbellSpec(data), {
    actions: false,
    renderer: "svg",
    tooltip: { theme: "light" },
  });
}

renderStateDumbbellChart();
