const fs = require('fs');

// Read the departments data
const data = JSON.parse(fs.readFileSync('./app/data/source.json', 'utf8'));
const departmentsData = data.results;

// Filter and extract the required information
const organizations = departmentsData
  .filter(org => ['live', 'exempt'].includes(org.details?.govuk_status))
  .map(org => ({
    analytics_identifier: org.analytics_identifier,
    title: org.title,
    govuk_status: org.details.govuk_status
  }))
  .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically by title

// Output the results
console.log('Live and Exempt Organizations:');
console.log(JSON.stringify(organizations, null, 2));

// Write to a file
fs.writeFileSync('organizations.json', JSON.stringify(organizations, null, 2));
console.log('\nResults have been written to organizations.json'); 