// Shared region lookup + Government-of-India geometry correction.
//
// Used by the offline world-map generator (scripts/generate-map.mjs) and its
// vitest suite (test/regions.test.ts). Kept as plain ESM (.mjs) so `node` can
// run the generator directly; types live alongside in regions.d.mts.

import polygonClipping from 'polygon-clipping';

// ── Country → region (every country in world-atlas countries-110m) ──
const NAME2REGION = {};
const put = (reg, names) => names.forEach((n) => { NAME2REGION[n] = reg; });
put('north-america', ['Canada', 'United States of America', 'Mexico', 'Greenland']);
put('latin-america', ['Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Haiti', 'Dominican Rep.', 'Jamaica', 'Bahamas', 'Trinidad and Tobago', 'Puerto Rico', 'Colombia', 'Venezuela', 'Guyana', 'Suriname', 'Ecuador', 'Peru', 'Brazil', 'Bolivia', 'Paraguay', 'Uruguay', 'Argentina', 'Chile', 'Falkland Is.']);
put('europe', ['Iceland', 'Ireland', 'United Kingdom', 'France', 'Spain', 'Portugal', 'Belgium', 'Netherlands', 'Luxembourg', 'Germany', 'Switzerland', 'Austria', 'Italy', 'Denmark', 'Norway', 'Sweden', 'Finland', 'Estonia', 'Latvia', 'Lithuania', 'Poland', 'Czechia', 'Slovakia', 'Hungary', 'Slovenia', 'Croatia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Kosovo', 'Albania', 'Macedonia', 'Greece', 'Bulgaria', 'Romania', 'Moldova', 'Ukraine', 'Belarus']);
put('russia-central-asia', ['Russia', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Mongolia', 'Georgia', 'Armenia', 'Azerbaijan']);
put('mena', ['W. Sahara', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Sudan', 'Turkey', 'Cyprus', 'N. Cyprus', 'Syria', 'Lebanon', 'Israel', 'Palestine', 'Jordan', 'Iraq', 'Iran', 'Kuwait', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Bahrain']);
put('sub-saharan-africa', ['Mauritania', 'Mali', 'Niger', 'Chad', 'Senegal', 'Gambia', 'Guinea-Bissau', 'Guinea', 'Sierra Leone', 'Liberia', "Côte d'Ivoire", 'Ghana', 'Togo', 'Benin', 'Burkina Faso', 'Nigeria', 'Cameroon', 'Eq. Guinea', 'Gabon', 'Congo', 'Dem. Rep. Congo', 'Central African Rep.', 'S. Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Somaliland', 'Kenya', 'Uganda', 'Rwanda', 'Burundi', 'Tanzania', 'Angola', 'Zambia', 'Malawi', 'Mozambique', 'Zimbabwe', 'Botswana', 'Namibia', 'South Africa', 'Lesotho', 'eSwatini', 'Madagascar']);
put('south-asia', ['Afghanistan', 'Pakistan', 'India', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka']);
put('east-asia', ['China', 'Taiwan', 'North Korea', 'South Korea', 'Japan']);
put('southeast-asia', ['Myanmar', 'Thailand', 'Laos', 'Vietnam', 'Cambodia', 'Malaysia', 'Brunei', 'Indonesia', 'Timor-Leste', 'Philippines']);
put('oceania', ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Is.', 'Vanuatu', 'New Caledonia']);
NAME2REGION['French Guiana'] = 'latin-america';      // split out of France in the generator
NAME2REGION['Aksai Chin (India)'] = 'south-asia';    // moved out of China by applyGoiCorrection

export { NAME2REGION };
export const regionOf = (name) => NAME2REGION[name] || null;

// ── Government of India depiction: J&K incl. Aksai Chin & Shaksgam = India.
//    Approximate footprint — replace with a vetted GoI-aligned boundary for a
//    production release. Ring orientation matches what d3-geo geoContains and
//    polygon-clipping treat as the enclosed (positive) interior. ──
export const GOI_CLAIM = {
  type: 'Polygon',
  coordinates: [[
    [75.0, 36.6], [76.8, 36.4], [78.5, 35.9], [80.5, 35.4], [80.1, 34.0],
    [78.6, 33.2], [77.0, 33.5], [76.3, 34.5], [75.6, 35.6], [75.0, 36.6],
  ]],
};

/**
 * Move Aksai Chin from China into South Asia (Government of India depiction).
 *
 * Natural Earth bakes Aksai Chin into China's polygon, so painting an overlay on
 * top can't change region ownership (color/selection still belong to China). This
 * edits the geometry instead: the part of the GoI claim that Natural Earth gives
 * to China is cut out of China and re-added as a separate South Asia feature.
 * The two share an identical cut edge, so the rebuilt topology renders a single
 * GoI-aligned border line between East Asia and South Asia.
 *
 * Mutates and returns the given feature list.
 */
export function applyGoiCorrection(features) {
  const china = features.find((f) => f.properties.name === 'China');
  if (!china) return features;

  const claim = GOI_CLAIM.coordinates;
  const aksai = polygonClipping.intersection(china.geometry.coordinates, claim);
  if (aksai.length) {
    china.geometry = {
      type: 'MultiPolygon',
      coordinates: rewindToD3(polygonClipping.difference(china.geometry.coordinates, claim)),
    };
    features.push({
      type: 'Feature',
      properties: { name: 'Aksai Chin (India)' },
      geometry: { type: 'MultiPolygon', coordinates: rewindToD3(aksai) },
    });
  }
  return features;
}

// polygon-clipping emits RFC-7946 winding (CCW exterior); d3-geo (geoPath,
// geoContains) and the world-atlas source use the opposite (CW exterior).
// Reverse every ring so clipped output matches the rest of the data.
function rewindToD3(multiPolygon) {
  return multiPolygon.map((poly) => poly.map((ring) => ring.slice().reverse()));
}
