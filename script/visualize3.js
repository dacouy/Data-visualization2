const LGA_TOPO_URL = "data/part3/lga_topo.json";
const LGA_CSV_URL = "data/part3/tfr_lga_2024_full.csv";
const STATE_GEO_URL = "data/part3/australia-states.json";
const STATE_GEO_VEGA_URL = "data/part3/australia-states-vega.json";
const STATE_CSV_URL = "data/part3/state_births_2024.csv";
const STATE_PIE_CSV_URL = "data/part3/state_birth_pie_2024.csv";
const TOPO_FEATURE = "LGA_2025_AUST_GDA2020";
const TOPO_KEY = "LGA_CODE25";
const NOT_PROVIDED = "N/P";

const MAP_FONT = "Times New Roman";
const NATIONAL_AVG = 1.481;
const STATE_NATIONAL_TFR = 1.54;
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
const STATE_PIE_FILL = "#8B1A1A";
const STATE_PIE_REMAINDER = "#eadfda";
const LGA_SPIKE_COLOR = "#344955";
const LGA_SPIKE_HIGHLIGHT = "#102a35";

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
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width: 980,
    height: 520,
    autosize: "none",
    background: MAP_BACKGROUND,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    data: [
      {
        name: "lgaRows",
        url: LGA_CSV_URL,
        format: {
          type: "csv",
          parse: {
            lga_code: "string",
            population_2024: "number",
            births_2024: "number",
            tfr_2024: "number",
          },
        },
      },
      {
        name: "rawLgas",
        url: LGA_TOPO_URL,
        format: { type: "topojson", feature: TOPO_FEATURE },
        transform: [
          {
            type: "filter",
            expr: "indexof(['1','2','3','4','5','6','7','8'], datum.properties.STE_CODE21) >= 0",
          },
        ],
      },
      {
        name: "lgas",
        source: "rawLgas",
        transform: [
          { type: "formula", as: "lga_code_join", expr: `datum.properties.${TOPO_KEY}` },
          {
            type: "formula",
            as: "lga_code_lookup",
            expr: "datum.lga_code_join === '71500' ? '71300' : datum.lga_code_join",
          },
          {
            type: "lookup",
            from: "lgaRows",
            key: "lga_code",
            fields: ["lga_code_lookup"],
            values: ["tfr_2024", "births_2024", "lga_name", "state"],
          },
          {
            type: "formula",
            as: "lga_name_display",
            expr: "isValid(datum.lga_name) ? datum.lga_name : datum.properties.LGA_NAME25",
          },
          {
            type: "formula",
            as: "state_display",
            expr: "isValid(datum.state) ? datum.state : datum.properties.STE_NAME21",
          },
          {
            type: "formula",
            as: "tfr_display",
            expr:
              "isValid(datum.tfr_2024) && isValid(datum.births_2024) && datum.births_2024 >= " +
              MIN_BIRTHS_FOR_COLOR +
              " ? format(datum.tfr_2024, '.2f') : '" +
              NOT_PROVIDED +
              "'",
          },
          {
            type: "formula",
            as: "births_display",
            expr: "isValid(datum.births_2024) ? format(datum.births_2024, ',') : '" + NOT_PROVIDED + "'",
          },
          { type: "formula", as: "centroid", expr: "geoCentroid('lgaProjection', datum)" },
          { type: "formula", as: "centroid_x", expr: "datum.centroid[0]" },
          { type: "formula", as: "centroid_y", expr: "datum.centroid[1]" },
        ],
      },
      {
        name: "birthSpikes",
        source: "lgas",
        transform: [
          {
            type: "filter",
            expr:
              "isValid(datum.births_2024) && datum.births_2024 > 0 && isValid(datum.centroid_x) && isValid(datum.centroid_y)",
          },
        ],
      },
      {
        name: "topBirthLabel",
        source: "birthSpikes",
        transform: [{ type: "filter", expr: "datum.lga_name_display === 'Brisbane'" }],
      },
      {
        name: "spikeLegend",
        values: [
          { x: 48, births: 100, label: "100", tick: true },
          { x: 82, births: 1000, label: "1,000", tick: true },
          { x: 130, births: 15000, label: "15,000", tick: true },
        ],
      },
      {
        name: "spikeLegendCurve",
        values: [
          { x: 42, y: 475 },
          { x: 130, y: 388 },
        ],
      },
    ],
    projections: [
      {
        name: "lgaProjection",
        type: "mercator",
        fit: { signal: "data('rawLgas')" },
        extent: [
          [-12, 18],
          [872, 500],
        ],
      },
    ],
    scales: [
      {
        name: "tfrColor",
        type: "linear",
        domain: tfrColorScale.domain,
        range: tfrColorScale.range,
      },
      {
        name: "spikeHeight",
        type: "sqrt",
        domain: [1, 12514],
        range: [2, 86],
        clamp: true,
      },
      {
        name: "spikeWidth",
        type: "sqrt",
        domain: [1, 12514],
        range: [0.85, 3.6],
        clamp: true,
      },
    ],
    legends: [
      {
        fill: "tfrColor",
        title: "Children per woman",
        orient: "none",
        legendX: 842,
        legendY: 360,
        gradientLength: 92,
        gradientThickness: 10,
        titlePadding: 10,
        labelOffset: 5,
        titleFont: MAP_FONT,
        labelFont: MAP_FONT,
        titleFontSize: 11,
        labelFontSize: 10,
      },
    ],
    marks: [
      {
        type: "shape",
        from: { data: "lgas" },
        transform: [{ type: "geoshape", projection: "lgaProjection" }],
        encode: {
          update: {
            fill: { value: LGA_MAP_BACKGROUND },
            stroke: { value: "#6f6255" },
            strokeWidth: { value: 0.45 },
          },
        },
      },
      {
        type: "shape",
        from: { data: "lgas" },
        transform: [{ type: "geoshape", projection: "lgaProjection" }],
        encode: {
          update: {
            fill: [
              { test: "!isValid(datum.tfr_2024)", value: LGA_MAP_BACKGROUND },
              {
                test:
                  "!isValid(datum.births_2024) || datum.births_2024 < " + MIN_BIRTHS_FOR_COLOR,
                value: LOW_COUNT_COLOR,
              },
              { scale: "tfrColor", field: "tfr_2024" },
            ],
            stroke: { value: null },
            tooltip: {
              signal:
                "{'LGA': datum.lga_name_display, 'State': datum.state_display, 'TFR 2024': datum.tfr_display, 'Births': datum.births_display}",
            },
          },
        },
      },
      {
        type: "rule",
        clip: true,
        from: { data: "birthSpikes" },
        encode: {
          update: {
            x: { field: "centroid_x" },
            y: { field: "centroid_y" },
            y2: { signal: "datum.centroid_y - scale('spikeHeight', datum.births_2024)" },
            stroke: [
              { test: "datum.births_2024 >= 5000", value: LGA_SPIKE_HIGHLIGHT },
              { value: LGA_SPIKE_COLOR },
            ],
            strokeWidth: { scale: "spikeWidth", field: "births_2024" },
            strokeCap: { value: "round" },
            strokeOpacity: { value: 0.72 },
            tooltip: {
              signal:
                "{'LGA': datum.lga_name_display, 'State': datum.state_display, 'Births': datum.births_display, 'TFR 2024': datum.tfr_display}",
            },
          },
        },
      },
      {
        type: "text",
        encode: {
          update: {
            x: { value: 42 },
            y: { value: 372 },
            text: { value: "Spike height = births registered" },
            align: { value: "left" },
            font: { value: MAP_FONT },
            fontSize: { value: 10 },
            fill: { value: "#5f2f24" },
          },
        },
      },
      {
        type: "area",
        from: { data: "spikeLegendCurve" },
        encode: {
          update: {
            x: { field: "x" },
            y: { field: "y" },
            y2: { value: 475 },
            interpolate: { value: "linear" },
            fill: { value: LGA_SPIKE_COLOR },
            fillOpacity: { value: 0.52 },
            stroke: { value: LGA_SPIKE_HIGHLIGHT },
            strokeWidth: { value: 1.2 },
          },
        },
      },
      {
        type: "rule",
        from: { data: "spikeLegend" },
        encode: {
          update: {
            x: { field: "x" },
            x2: { field: "x" },
            y: { value: 475 },
            y2: { value: 480 },
            stroke: { value: "#bca99b" },
            strokeWidth: { value: 1 },
          },
        },
      },
      {
        type: "text",
        from: { data: "spikeLegend" },
        encode: {
          update: {
            x: { field: "x" },
            y: { value: 494 },
            text: { field: "label" },
            align: { value: "center" },
            font: { value: MAP_FONT },
            fontSize: { value: 9 },
            fill: { value: "#6f6255" },
          },
        },
      },
      {
        type: "text",
        from: { data: "topBirthLabel" },
        encode: {
          update: {
            x: { signal: "datum.centroid_x + 10" },
            y: { signal: "datum.centroid_y - scale('spikeHeight', datum.births_2024) - 8" },
            text: { signal: "datum.lga_name_display + ' (' + datum.births_display + ')'" },
            align: { value: "left" },
            font: { value: MAP_FONT },
            fontSize: { value: 11 },
            fontWeight: { value: "bold" },
            fill: { value: LGA_SPIKE_HIGHLIGHT },
          },
        },
      },
    ],
  };
}

function buildStatePieMapSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width: 980,
    height: 520,
    autosize: "none",
    background: MAP_BACKGROUND,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    projections: [
      {
        name: "australia",
        type: "mercator",
        center: australiaStateProjection.center,
        scale: australiaStateProjection.scale,
        translate: australiaStateProjection.translate,
      },
    ],
    data: [
      {
        name: "statePieRows",
        url: STATE_PIE_CSV_URL,
        format: {
          type: "csv",
          parse: {
            state_code: "string",
            population_2024: "number",
            births_2024: "number",
            tfr_2024: "number",
            lon: "number",
            lat: "number",
            birth_share: "number",
            pie_dx: "number",
            pie_dy: "number",
            pie_radius: "number",
            slice_value: "number",
            start_angle: "number",
            end_angle: "number",
          },
        },
        transform: [
          {
            type: "geopoint",
            projection: "australia",
            fields: ["lon", "lat"],
            as: ["x", "y"],
          },
          { type: "formula", as: "pie_x", expr: "datum.x + datum.pie_dx" },
          { type: "formula", as: "pie_y", expr: "datum.y + datum.pie_dy" },
          { type: "formula", as: "births_display", expr: "format(datum.births_2024, ',')" },
          { type: "formula", as: "population_display", expr: "format(datum.population_2024, ',')" },
          { type: "formula", as: "tfr_display", expr: "format(datum.tfr_2024, '.2f')" },
        ],
      },
      {
        name: "statePieAnchors",
        source: "statePieRows",
        transform: [{ type: "filter", expr: "datum.slice === 'birth_share'" }],
      },
      {
        name: "states",
        url: STATE_GEO_VEGA_URL,
        format: { type: "json", property: "features" },
        transform: [
          {
            type: "filter",
            expr: "datum.properties.STE_CODE21 !== '9' && datum.properties.STE_CODE21 !== 'Z'",
          },
          { type: "formula", as: "state_code_join", expr: "datum.properties.STE_CODE21" },
          {
            type: "lookup",
            from: "statePieAnchors",
            key: "state_code",
            fields: ["state_code_join"],
            values: ["tfr_2024", "state", "birth_share_label"],
          },
        ],
      },
    ],
    scales: [
      {
        name: "stateTfrColor",
        type: "linear",
        domain: [1.34, STATE_NATIONAL_TFR, 1.64],
        range: tfrColorScale.range,
      },
    ],
    legends: [
      {
        fill: "stateTfrColor",
        title: "TFR 2024",
        orient: "none",
        legendX: 58,
        legendY: 330,
        gradientLength: 130,
        gradientThickness: 12,
        titleFont: MAP_FONT,
        labelFont: MAP_FONT,
        titleFontSize: 12,
        labelFontSize: 11,
        titleColor: "#5f2f24",
        labelColor: "#5f2f24",
      },
    ],
    marks: [
      {
        type: "shape",
        clip: true,
        from: { data: "states" },
        transform: [
          {
            type: "geoshape",
            projection: "australia",
          },
        ],
        encode: {
          update: {
            fill: [
              { test: "isValid(datum.tfr_2024)", scale: "stateTfrColor", field: "tfr_2024" },
              { value: STATE_BASE_FILL },
            ],
            stroke: { value: STATE_BOUNDARY_COLOR },
            strokeWidth: { value: 1.15 },
            tooltip: {
              signal:
                "{'State': datum.properties.STE_NAME21, 'TFR 2024': isValid(datum.tfr_2024) ? format(datum.tfr_2024, '.2f') : 'No data'}",
            },
          },
        },
      },
      {
        type: "shape",
        clip: true,
        from: { data: "states" },
        transform: [
          {
            type: "geoshape",
            projection: "australia",
          },
        ],
        encode: {
          update: {
            fillOpacity: { value: 0 },
            stroke: { value: "#5f2f24" },
            strokeWidth: { value: 0.45 },
            opacity: { value: 0.58 },
          },
        },
      },
      {
        type: "rule",
        from: { data: "statePieAnchors" },
        encode: {
          update: {
            x: { field: "x" },
            y: { field: "y" },
            x2: { field: "pie_x" },
            y2: { field: "pie_y" },
            stroke: { value: "#7d675d" },
            strokeWidth: { value: 0.8 },
            strokeOpacity: { value: 0.45 },
          },
        },
      },
      {
        type: "arc",
        from: { data: "statePieRows" },
        encode: {
          update: {
            x: { field: "pie_x" },
            y: { field: "pie_y" },
            startAngle: { field: "start_angle" },
            endAngle: { field: "end_angle" },
            innerRadius: { value: 0 },
            outerRadius: { field: "pie_radius" },
            fill: [
              { test: "datum.slice === 'birth_share'", value: STATE_PIE_FILL },
              { value: STATE_PIE_REMAINDER },
            ],
            stroke: { value: "#ffffff" },
            strokeWidth: { value: 1.1 },
            tooltip: {
              signal:
                "{'State': datum.state_name, 'Birth share': datum.birth_share_label, 'Births': datum.births_display, 'Population': datum.population_display, 'TFR 2024': datum.tfr_display}",
            },
          },
        },
      },
      {
        type: "arc",
        from: { data: "statePieAnchors" },
        encode: {
          update: {
            x: { field: "pie_x" },
            y: { field: "pie_y" },
            startAngle: { value: -0.25 },
            endAngle: { value: 6.033185 },
            innerRadius: { signal: "datum.pie_radius - 1" },
            outerRadius: { field: "pie_radius" },
            fill: { value: "#6f6255" },
            fillOpacity: { value: 0.65 },
          },
        },
      },
      {
        type: "text",
        from: { data: "statePieAnchors" },
        encode: {
          update: {
            x: { field: "pie_x" },
            y: { signal: "datum.pie_y - datum.pie_radius - 9" },
            text: { field: "state" },
            align: { value: "center" },
            baseline: { value: "bottom" },
            font: { value: MAP_FONT },
            fontSize: { value: 12 },
            fontWeight: { value: "bold" },
            fill: [
              { test: "datum.state === 'NT' || datum.state === 'QLD' || datum.state === 'NSW'", value: "#ffffff" },
              { value: "#4a3a32" },
            ],
          },
        },
      },
      {
        type: "text",
        from: { data: "statePieAnchors" },
        encode: {
          update: {
            x: { field: "pie_x" },
            y: { signal: "datum.pie_y + 8" },
            text: { field: "birth_share_label" },
            align: { value: "center" },
            baseline: { value: "middle" },
            font: { value: MAP_FONT },
            fontSize: { signal: "datum.pie_radius < 25 ? 11 : 12" },
            fontWeight: { value: "bold" },
            fill: { value: "#5f2f24" },
          },
        },
      },
      {
        type: "text",
        encode: {
          update: {
            x: { value: 120 },
            y: { value: 438 },
            text: { value: "Pie slice = share of national births" },
            align: { value: "left" },
            font: { value: MAP_FONT },
            fontSize: { value: 12 },
            fill: { value: "#5f2f24" },
          },
        },
      },
    ],
  };
}

vegaEmbed("#lga-map", buildMapSpec(), {
  actions: false,
  renderer: "svg",
  tooltip: { theme: "light" },
});

vegaEmbed("#state-births-map", buildStatePieMapSpec(), {
  actions: false,
  renderer: "svg",
  tooltip: { theme: "light" },
});
