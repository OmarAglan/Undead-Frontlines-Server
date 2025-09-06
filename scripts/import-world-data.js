const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting World Data Import ---');

  // 1. Read data files
  const dataPath = path.join(__dirname, '..', 'data');
  const countries = JSON.parse(fs.readFileSync(path.join(dataPath, 'countries.json'), 'utf-8'));
  const governorates = JSON.parse(fs.readFileSync(path.join(dataPath, 'states.json'), 'utf-8'));
  const cities = JSON.parse(fs.readFileSync(path.join(dataPath, 'cities.json'), 'utf-8'));

  console.log(`Found ${countries.length} countries, ${governorates.length} governorates, and ${cities.length} cities.`);

  // 2. Import Countries
  console.log('\nImporting Countries...');
  await prisma.country.createMany({
    data: countries.map(c => ({ name: c.name })),
    skipDuplicates: true,
  });
  console.log('✅ Countries imported successfully.');

  const dbCountries = await prisma.country.findMany();
  const countryNameIdMap = new Map(dbCountries.map(c => [c.name, c.id]));
  const sourceCountryIdToDbId = new Map(countries.map(c => [c.id, countryNameIdMap.get(c.name)]));

  // 3. Import Governorates
  console.log('\nImporting Governorates...');
  for (const gov of governorates) {
    const countryId = sourceCountryIdToDbId.get(gov.country_id);
    if (!countryId) continue;

    await prisma.governorate.upsert({
      where: {
        name_countryId: {
          name: gov.name,
          countryId: countryId,
        },
      },
      update: {},
      create: {
        name: gov.name,
        countryId: countryId,
      },
    });
  }
  console.log('✅ Governorates imported successfully.');
  
  const dbGovernorates = await prisma.governorate.findMany();
  const govCompositeKeyToIdMap = new Map(dbGovernorates.map(g => [`${g.name}_${g.countryId}`, g.id]));
  const sourceGovIdToDbId = new Map();
  for (const gov of governorates) {
      const countryId = sourceCountryIdToDbId.get(gov.country_id);
      if(!countryId) continue;
      const dbId = govCompositeKeyToIdMap.get(`${gov.name}_${countryId}`);
      if(dbId) {
        sourceGovIdToDbId.set(gov.id, dbId);
      }
  }

  // 4. Import Cities (with duplicate handling)
  console.log('\nImporting Cities...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);
    
    // --- NEW: Add a Set to track duplicates WITHIN this batch ---
    const processedInBatch = new Set();
    
    const promises = batch.map(city => {
      const governorateId = sourceGovIdToDbId.get(city.state_id);
      if (!governorateId) return null;

      // --- NEW: Create a unique key and check for duplicates ---
      const uniqueKey = `${city.name}_${governorateId}`;
      if (processedInBatch.has(uniqueKey)) {
        return null; // Skip this duplicate within the batch
      }
      processedInBatch.add(uniqueKey);

      return prisma.city.upsert({
        where: {
          name_governorateId: {
            name: city.name,
            governorateId: governorateId,
          },
        },
        update: {},
        create: {
          name: city.name,
          governorateId: governorateId,
        },
      });
    }).filter(p => p !== null);
    
    await Promise.all(promises);
    console.log(`  - Imported batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(cities.length / BATCH_SIZE)}...`);
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