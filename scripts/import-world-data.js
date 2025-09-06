const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// --- Configuration ---
// This map helps reconcile the source data's 'state' term with our 'governorate' term.
const DATA_SOURCE_MAPPING = {
  country: { id: 'id', name: 'name' },
  governorate: { id: 'id', name: 'name', countryId: 'country_id' },
  city: { id: 'id', name: 'name', governorateId: 'state_id' },
};

async function main() {
  console.log('--- Starting World Data Import ---');

  // 1. Read data files from the /data directory
  const dataPath = path.join(__dirname, '..', 'data');
  const countries = JSON.parse(fs.readFileSync(path.join(dataPath, 'countries.json'), 'utf-8'));
  const governorates = JSON.parse(fs.readFileSync(path.join(dataPath, 'states.json'), 'utf-8'));
  const cities = JSON.parse(fs.readFileSync(path.join(dataPath, 'cities.json'), 'utf-8'));

  console.log(`Found ${countries.length} countries, ${governorates.length} governorates, and ${cities.length} cities.`);

  // 2. Import Countries
  console.log('\nImporting Countries...');
  for (const country of countries) {
    await prisma.country.upsert({
      where: { name: country[DATA_SOURCE_MAPPING.country.name] },
      update: {}, // No updates needed if it exists
      create: {
        name: country[DATA_SOURCE_MAPPING.country.name],
        // You can set a default safeZoneHost here if you want
        // safeZoneHost: '127.0.0.1:7770',
      },
    });
  }
  console.log('✅ Countries imported successfully.');

  // We need a map of old ID -> new ID to link relations
  const countryMap = new Map();
  const dbCountries = await prisma.country.findMany();
  dbCountries.forEach(c => countryMap.set(c.name, c.id));
  
  // Create a map of source country ID to our new database country ID
  const sourceCountryIdToDbId = new Map();
  countries.forEach(c => {
    const dbId = countryMap.get(c.name);
    if (dbId) {
      sourceCountryIdToDbId.set(c.id, dbId);
    }
  });


  // 3. Import Governorates
  console.log('\nImporting Governorates...');
  for (const gov of governorates) {
    const countryId = sourceCountryIdToDbId.get(gov[DATA_SOURCE_MAPPING.governorate.countryId]);
    if (!countryId) {
      // Skip governorates whose country was not found/imported
      continue;
    }

    await prisma.governorate.upsert({
      where: {
        // A unique constraint on {name, countryId} would be ideal.
        // For now, we simulate it with a more complex find.
        // NOTE: This can be slow. In a real production import, you'd add a unique constraint in the DB.
        name_countryId: {
            name: gov[DATA_SOURCE_MAPPING.governorate.name],
            countryId: countryId,
        },
      },
      update: {},
      create: {
        name: gov[DATA_SOURCE_MAPPING.governorate.name],
        countryId: countryId,
      },
    });
  }
  console.log('✅ Governorates imported successfully.');
  
  // Create a map of source governorate ID to our new database governorate ID
  const governorateMap = new Map();
  const dbGovernorates = await prisma.governorate.findMany();
  dbGovernorates.forEach(g => governorateMap.set(g.name + g.countryId, g.id));
  
  const sourceGovIdToDbId = new Map();
  governorates.forEach(g => {
    const countryId = sourceCountryIdToDbId.get(g.country_id);
    const dbId = governorateMap.get(g.name + countryId);
    if (dbId) {
      sourceGovIdToDbId.set(g.id, dbId);
    }
  });


  // 4. Import Cities
  console.log('\nImporting Cities...');
  // Importing cities in batches is more efficient
  const cityBatches = [];
  let currentBatch = [];
  for (const city of cities) {
    const governorateId = sourceGovIdToDbId.get(city[DATA_SOURCE_MAPPING.city.governorateId]);
    if (!governorateId) {
      continue;
    }
    currentBatch.push({
      name: city[DATA_SOURCE_MAPPING.city.name],
      governorateId: governorateId,
    });

    if (currentBatch.length === 1000) {
      cityBatches.push(currentBatch);
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) {
    cityBatches.push(currentBatch);
  }

  for (const batch of cityBatches) {
    // createMany is much faster but doesn't have upsert.
    // We assume we are running this on a clean DB for cities.
    // For re-runnable scripts, this would need to be an upsert loop like above.
    await prisma.city.createMany({
      data: batch,
      skipDuplicates: true, // This helps avoid errors if a city already exists
    });
    console.log(`  - Imported a batch of ${batch.length} cities...`);
  }
  console.log('✅ Cities imported successfully.');

  console.log('\n--- World Data Import Finished ---');
}

main()
  .catch((e) => {
    console.error('An error occurred during the import:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });