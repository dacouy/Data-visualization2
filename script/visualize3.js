const LGA_TOPO_URL = "data/lga_topo.json";
const LGA_CSV_URL = "data/tfr_lga_2024_full.csv";
const STATE_GEO_URL = "data/australia-states.json";
const STATE_CSV_URL = "data/state_births_2024.csv";
const TOPO_FEATURE = "LGA_2025_AUST_GDA2020";
const TOPO_KEY = "LGA_CODE25";
const NOT_PROVIDED = "N/P";

const MAP_FONT = "Times New Roman";
const NATIONAL_AVG = 1.481;
const LOW_TFR_COLOR = "#8B1A1A";
const MID_TFR_COLOR = "#EAD9BB";
const HIGH_TFR_COLOR = "#2D6B2D";
const MAP_BACKGROUND = "#FFFFFF";
const LGA_MAP_BACKGROUND = "#f6eee8";
const LOW_COUNT_COLOR = "#C6BDAB";
const MIN_BIRTHS_FOR_COLOR = 20;
const STATE_BASE_FILL = "#f6eee8";
const STATE_BOUNDARY_COLOR = "#7a4b3a";
const STATE_BUBBLE_LOW = "#d7b79f";
const STATE_BUBBLE_MID = "#b9784f";
const STATE_BUBBLE_HIGH = "#8B1A1A";

const tfrColorScale = {
  domain: [0.5, NATIONAL_AVG, 4.0],
  range: [LOW_TFR_COLOR, MID_TFR_COLOR, HIGH_TFR_COLOR],
};

const tfrLegend = {
  title: "Children per woman",
  titleFont: MAP_FONT,
  labelFont: MAP_FONT,
  titleFontSize: 13,
  labelFontSize: 12,
  orient: "bottom-right",
  gradientLength: 140,
  gradientThickness: 14,
};

const CAPITAL_CITIES = [
  { city: "Sydney", state_display: "NSW", lat: -33.87, lon: 151.21, births: 89030, tfr_2024: 1.46 },
  { city: "Melbourne", state_display: "VIC", lat: -37.81, lon: 144.96, births: 81193, tfr_2024: 1.52 },
  { city: "Brisbane", state_display: "QLD", lat: -27.47, lon: 153.03, births: 58838, tfr_2024: 1.51 },
  { city: "Perth", state_display: "WA", lat: -31.95, lon: 115.86, births: 30541, tfr_2024: 1.43 },
  { city: "Adelaide", state_display: "SA", lat: -34.93, lon: 138.6, births: 18444, tfr_2024: 1.46 },
  { city: "Hobart", state_display: "TAS", lat: -42.88, lon: 147.33, births: 5509, tfr_2024: 1.49 },
  { city: "Darwin", state_display: "NT", lat: -12.46, lon: 130.84, births: 3521, tfr_2024: 1.63 },
  { city: "Canberra", state_display: "ACT", lat: -35.28, lon: 149.13, births: 5218, tfr_2024: 1.27 },
];

const capitalTransforms = [
  { calculate: "datum.city", as: "lga_name_display" },
  { calculate: "format(datum.tfr_2024, '.2f')", as: "tfr_display" },
  { calculate: "format(datum.births, ',')", as: "births_display" },
];

const lgaTransforms = [
  {
    calculate: `datum.properties.${TOPO_KEY}`,
    as: "lga_code_join",
  },
  {
    calculate: "datum.lga_code_join == '71500' ? '71300' : datum.lga_code_join",
    as: "lga_code_lookup",
  },
  {
    lookup: "lga_code_lookup",
    from: {
      data: {
        url: LGA_CSV_URL,
        format: {
          type: "csv",
          parse: {
            lga_code: "string",
            tfr_2024: "number",
            births_2024: "number",
          },
        },
      },
      key: "lga_code",
      fields: ["tfr_2024", "births_2024", "lga_name", "state"],
    },
  },
  {
    calculate: "isValid(datum.lga_name) ? datum.lga_name : datum.properties.LGA_NAME25",
    as: "lga_name_display",
  },
  {
    calculate: "isValid(datum.state) ? datum.state : datum.properties.STE_NAME21",
    as: "state_display",
  },
  {
    calculate:
      "isValid(datum.tfr_2024) && isValid(datum.births_2024) && datum.births_2024 >= " +
      MIN_BIRTHS_FOR_COLOR +
      " ? format(datum.tfr_2024, '.2f') : '" +
      NOT_PROVIDED +
      "'",
    as: "tfr_display",
  },
  {
    calculate: "isValid(datum.births_2024) ? format(datum.births_2024, ',') : '" + NOT_PROVIDED + "'",
    as: "births_display",
  },
];

const lgaTooltip = [
  { field: "lga_name_display", type: "nominal", title: "LGA" },
  { field: "state_display", type: "nominal", title: "State" },
  { field: "tfr_display", type: "nominal", title: "TFR 2024" },
  { field: "births_display", type: "nominal", title: "Births" },
];

const lgaTopoData = {
  url: LGA_TOPO_URL,
  format: { type: "topojson", feature: TOPO_FEATURE },
};

const stateGeoData = {
  url: STATE_GEO_URL,
  format: { type: "json", property: "features" },
};

const stateBubbleData = {
  url: STATE_CSV_URL,
  format: {
    type: "csv",
    parse: {
      state_code: "string",
      population_2024: "number",
      births_2024: "number",
      tfr_2024: "number",
      lon: "number",
      lat: "number",
    },
  },
};

const stateBubbleTransforms = [
  { calculate: "format(datum.births_2024, ',')", as: "births_display" },
  { calculate: "format(datum.population_2024, ',')", as: "population_display" },
  { calculate: "format(datum.tfr_2024, '.2f')", as: "tfr_display" },
];

const stateBubbleTooltip = [
  { field: "state_name", type: "nominal", title: "State or territory" },
  { field: "births_display", type: "nominal", title: "Births" },
  { field: "population_display", type: "nominal", title: "Population" },
  { field: "tfr_display", type: "nominal", title: "TFR 2024" },
];

const australiaStateProjection = {
  type: "mercator",
  center: [134, -28],
  scale: 650,
  translate: [490, 285],
};

function buildMapSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 600,
    background: MAP_BACKGROUND,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    projection: {
      type: "mercator",
    },
    title: {
      text: "Where Australia's babies are born",
      subtitle: "Total fertility rate by Local Government Area, 2024",
      anchor: "start",
      font: MAP_FONT,
      subtitleFont: MAP_FONT,
      fontSize: 22,
      subtitleFontSize: 15,
      color: "#1C1C1C",
      subtitleColor: "#6f6255",
      offset: 14,
    },
    layer: [
      {
        data: lgaTopoData,
        mark: {
          type: "geoshape",
          fill: LGA_MAP_BACKGROUND,
          stroke: "#6f6255",
          strokeWidth: 0.45,
        },
      },
      {
        data: lgaTopoData,
        transform: lgaTransforms,
        mark: {
          type: "geoshape",
          stroke: null,
        },
        encoding: {
          color: {
            condition: [
              { test: "!isValid(datum.tfr_2024)", value: LGA_MAP_BACKGROUND },
              {
                test:
                  "!isValid(datum.births_2024) || datum.births_2024 < " +
                  MIN_BIRTHS_FOR_COLOR,
                value: LOW_COUNT_COLOR,
              },
            ],
            field: "tfr_2024",
            type: "quantitative",
            scale: tfrColorScale,
            legend: tfrLegend,
          },
          tooltip: lgaTooltip,
        },
      },
      {
        data: { values: CAPITAL_CITIES },
        transform: capitalTransforms,
        mark: {
          type: "circle",
          fill: "#b86f5c",
          fillOpacity: 0.68,
          stroke: "#7a3b31",
          strokeWidth: 2,
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          size: {
            field: "births",
            type: "quantitative",
            scale: { range: [220, 1900] },
            legend: {
              title: "Births in 2024 at capital city",
              titleFont: MAP_FONT,
              labelFont: MAP_FONT,
              titleFontSize: 12,
              labelFontSize: 11,
              titleColor: "#5f2f24",
              labelColor: "#5f2f24",
              orient: "none",
              legendX: 58,
              legendY: 442,
              values: [20000, 60000, 90000],
              labelExpr: "format(datum.value, ',')",
              symbolType: "circle",
              symbolLimit: 3,
              symbolFillColor: "#b86f5c",
              symbolStrokeColor: "#7a3b31",
              symbolStrokeWidth: 2,
              symbolOpacity: 1,
            },
          },
          tooltip: lgaTooltip,
        },
      },
      {
        data: { values: CAPITAL_CITIES },
        mark: {
          type: "text",
          dy: -14,
          font: MAP_FONT,
          fontSize: 11,
          fontWeight: "bold",
          color: "#1C1C1C",
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          text: { field: "city" },
        },
      },
      {
        data: { values: [{ lon: 144.97, lat: -37.82 }] },
        mark: {
          type: "text",
          text: "Melbourne CBD\n0.54 - lowest",
          align: "right",
          dx: -12,
          dy: 22,
          font: MAP_FONT,
          fontSize: 11,
          fontStyle: "italic",
          color: LOW_TFR_COLOR,
          lineBreak: "\n",
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
        },
      },
      {
        data: { values: [{ lon: 151.95, lat: -26.28 }] },
        mark: {
          type: "text",
          text: "Cherbourg, QLD\n3.99 - highest",
          align: "left",
          dx: 31,
          dy: -10,
          font: MAP_FONT,
          fontSize: 11,
          fontStyle: "italic",
          color: HIGH_TFR_COLOR,
          lineBreak: "\n",
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
        },
      },
    ],
    config: {
      view: { stroke: "#6f6255", strokeWidth: 1 },
    },
  };
}

function buildStateBubbleMapSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 520,
    background: MAP_BACKGROUND,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    projection: australiaStateProjection,
    title: {
      text: "Births cluster in the big states",
      subtitle: "Bubble size shows births registered in 2024; colour shows total fertility rate",
      anchor: "start",
      font: MAP_FONT,
      subtitleFont: MAP_FONT,
      fontSize: 20,
      subtitleFontSize: 14,
      color: "#1C1C1C",
      subtitleColor: "#6f6255",
      offset: 12,
    },
    layer: [
      // State boundaries from data/australia-states.json.
      {
        data: stateGeoData,
        transform: [
          {
            filter: "datum.properties.STE_CODE21 != '9' && datum.properties.STE_CODE21 != 'Z'",
          },
        ],
        mark: {
          type: "geoshape",
          fill: STATE_BASE_FILL,
          stroke: STATE_BOUNDARY_COLOR,
          strokeWidth: 1.15,
        },
      },
      // Extra outline layer keeps borders readable.
      {
        data: stateGeoData,
        transform: [
          {
            filter: "datum.properties.STE_CODE21 != '9' && datum.properties.STE_CODE21 != 'Z'",
          },
        ],
        mark: {
          type: "geoshape",
          fill: null,
          stroke: "#5f2f24",
          strokeWidth: 0.45,
          opacity: 0.58,
        },
      },
      // Birth volume bubbles from state_births_2024.csv.
      {
        data: stateBubbleData,
        transform: stateBubbleTransforms,
        mark: {
          type: "circle",
          opacity: 0.82,
          stroke: "#5f2f24",
          strokeWidth: 1.25,
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          size: {
            field: "births_2024",
            type: "quantitative",
            scale: { range: [80, 2100] },
            legend: {
              title: "Births in 2024",
              titleFont: MAP_FONT,
              labelFont: MAP_FONT,
              titleFontSize: 12,
              labelFontSize: 11,
              titleColor: "#5f2f24",
              labelColor: "#5f2f24",
              orient: "none",
              legendX: 58,
              legendY: 378,
              values: [5000, 30000, 90000],
              labelExpr: "format(datum.value, ',')",
              symbolType: "circle",
              symbolLimit: 3,
              symbolFillColor: "#b86f5c",
              symbolStrokeColor: "#7a3b31",
              symbolStrokeWidth: 2,
              symbolOpacity: 1,
            },
          },
          color: {
            field: "tfr_2024",
            type: "quantitative",
            scale: {
              domain: [1.3, NATIONAL_AVG, 1.7],
              range: tfrColorScale.range,
            },
            legend: {
              ...tfrLegend,
              orient: "bottom-right",
              title: "TFR 2024",
            },
          },
          tooltip: stateBubbleTooltip,
        },
      },
      // Text halo behind state abbreviations.
      {
        data: stateBubbleData,
        transform: stateBubbleTransforms,
        mark: {
          type: "text",
          dy: 22,
          font: MAP_FONT,
          fontSize: 11,
          fontWeight: "bold",
          color: "#5f2f24",
          stroke: MAP_BACKGROUND,
          strokeWidth: 2,
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          text: { field: "state" },
        },
      },
      // State abbreviations.
      {
        data: stateBubbleData,
        transform: stateBubbleTransforms,
        mark: {
          type: "text",
          dy: 22,
          font: MAP_FONT,
          fontSize: 11,
          fontWeight: "bold",
          color: "#5f2f24",
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          text: { field: "state" },
        },
      },
    ],
    config: {
      view: { stroke: "#6f6255", strokeWidth: 1 },
    },
  };
}

vegaEmbed("#lga-map", buildMapSpec(), {
  actions: false,
  renderer: "canvas",
  tooltip: { theme: "light" },
});

vegaEmbed("#state-births-map", buildStateBubbleMapSpec(), {
  actions: false,
  renderer: "canvas",
  tooltip: { theme: "light" },
});
