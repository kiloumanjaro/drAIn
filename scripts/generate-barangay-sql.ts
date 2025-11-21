import fs from 'fs';
import path from 'path';

interface GeoJSONFeature {
  type: string;
  properties: {
    name: string;
    'population-count'?: string;
    'population-density'?: string;
    'land-area'?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GeoJSON {
  type: string;
  features: GeoJSONFeature[];
}

// Read the GeoJSON file
const geojsonPath = path.join(process.cwd(), 'public/additional-overlays/mandaue_population.geojson');

if (!fs.existsSync(geojsonPath)) {
  console.error(`❌ GeoJSON file not found at: ${geojsonPath}`);
  process.exit(1);
}

console.log(`📖 Reading GeoJSON from: ${geojsonPath}`);
const geojsonData: GeoJSON = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

console.log(`📊 Total features in GeoJSON: ${geojsonData.features.length}`);

// SQL output
let sql = `-- Generated SQL for barangay boundaries from mandaue_population.geojson\n`;
sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

sql += `-- ============================================================================\n`;
sql += `-- Enable PostGIS extension for geographic calculations\n`;
sql += `-- ============================================================================\n`;
sql += `CREATE EXTENSION IF NOT EXISTS postgis;\n\n`;

sql += `-- ============================================================================\n`;
sql += `-- Create barangay boundaries table\n`;
sql += `-- ============================================================================\n`;
sql += `CREATE TABLE IF NOT EXISTS barangay_boundaries (\n`;
sql += `  id SERIAL PRIMARY KEY,\n`;
sql += `  name VARCHAR(255) NOT NULL UNIQUE,\n`;
sql += `  boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,\n`;
sql += `  population_count VARCHAR(50),\n`;
sql += `  population_density VARCHAR(50),\n`;
sql += `  land_area VARCHAR(50),\n`;
sql += `  created_at TIMESTAMP DEFAULT NOW()\n`;
sql += `);\n\n`;

sql += `-- ============================================================================\n`;
sql += `-- Create spatial index for fast point-in-polygon queries\n`;
sql += `-- ============================================================================\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_barangay_boundary_gist \n`;
sql += `ON barangay_boundaries USING GIST(boundary);\n\n`;

sql += `-- ============================================================================\n`;
sql += `-- Insert barangay boundaries from GeoJSON\n`;
sql += `-- ============================================================================\n`;

// Filter out "Mandaue City" (it's the outer boundary, not a barangay)
const barangays = geojsonData.features.filter(
  f => f.properties.name !== 'Mandaue City' && f.geometry.type === 'Polygon'
);

console.log(`🏘️  Found ${barangays.length} barangays (excluding city boundary)`);

barangays.forEach((feature, index) => {
  const name = feature.properties.name.replace(/'/g, "''"); // Escape single quotes
  const popCount = feature.properties['population-count'] || null;
  const popDensity = feature.properties['population-density'] || null;
  const landArea = feature.properties['land-area'] || null;

  // Extract coordinates (remove altitude/z-coordinate if present)
  // GeoJSON format: [longitude, latitude, altitude]
  const coords = feature.geometry.coordinates[0].map(coord => {
    // Take only lon, lat (first two values)
    return `${coord[0]} ${coord[1]}`;
  }).join(', ');

  // Create WKT POLYGON
  const wkt = `POLYGON((${coords}))`;

  // SQL INSERT
  sql += `INSERT INTO barangay_boundaries (name, boundary, population_count, population_density, land_area)\n`;
  sql += `VALUES (\n`;
  sql += `  '${name}',\n`;
  sql += `  ST_GeogFromText('${wkt}'),\n`;
  sql += `  ${popCount ? `'${popCount}'` : 'NULL'},\n`;
  sql += `  ${popDensity ? `'${popDensity}'` : 'NULL'},\n`;
  sql += `  ${landArea ? `'${landArea}'` : 'NULL'}\n`;
  sql += `);\n\n`;
});

sql += `-- ============================================================================\n`;
sql += `-- Verification queries\n`;
sql += `-- ============================================================================\n`;
sql += `-- Count total barangays\n`;
sql += `SELECT COUNT(*) as total_barangays FROM barangay_boundaries;\n\n`;

sql += `-- List all barangay names\n`;
sql += `SELECT name FROM barangay_boundaries ORDER BY name;\n`;

// Write to migration file
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251121_barangay_boundaries.sql');
fs.writeFileSync(migrationPath, sql);

console.log(`\n✅ Successfully generated SQL migration!`);
console.log(`📝 Output file: ${migrationPath}`);
console.log(`📊 Total barangays: ${barangays.length}`);
console.log(`\n📋 List of barangays to be inserted:`);
barangays.forEach((f, i) => {
  console.log(`   ${i + 1}. ${f.properties.name}`);
});

console.log(`\n🚀 Next steps:`);
console.log(`   1. npx supabase db push`);
console.log(`   2. Verify: SELECT COUNT(*) FROM barangay_boundaries;`);
