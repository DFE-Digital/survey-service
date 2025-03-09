//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add the date filter
addFilter('date', function(str) {
  if (!str) return '';
  const date = new Date(str);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

// Add capitalize filter
addFilter('capitalize', function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});

// Add your filters here

addFilter.pendingRegistrations = function(registrations) {
  return registrations
    .filter(reg => reg.status === 'pending')
    .map(reg => [
      { text: `${reg.firstName} ${reg.lastName}` },
      { text: reg.email },
      { text: reg.department },
      { text: reg.justification },
      { text: addFilter.date(reg.created_at) },
      { 
        html: `
          <a href="/admin/registrations/${reg.id}/approve" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0 govuk-!-margin-right-1 js-approve-registration">Approve</a>
          <a href="/admin/registrations/${reg.id}/reject" class="govuk-button govuk-button--warning govuk-!-margin-bottom-0 js-reject-registration">Reject</a>
        `
      }
    ]);
}

addFilter.historyRegistrations = function(registrations) {
  return registrations
    .filter(reg => reg.status !== 'pending')
    .map(reg => [
      { text: `${reg.firstName} ${reg.lastName}` },
      { text: reg.email },
      { text: reg.department },
      { 
        text: reg.status === 'approved' ? 'Approved' : 'Rejected',
        classes: reg.status === 'approved' ? 'govuk-tag' : 'govuk-tag govuk-tag--red'
      },
      { text: addFilter.date(reg.updated_at) }
    ]);
}

// Format a row for pending registrations table
addFilter('formatPendingRow', function(reg) {
  return [
    { text: reg.name },
    { text: reg.email },
    { text: reg.department },
    { text: reg.justification },
    { text: addFilter.date(reg.submitted) },
    { 
      html: `
        <a href="/admin/registrations/${reg.id}/approve" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0 govuk-!-margin-right-1 js-approve-registration">Approve</a>
        <a href="/admin/registrations/${reg.id}/reject" class="govuk-button govuk-button--warning govuk-!-margin-bottom-0 js-reject-registration">Reject</a>
      `
    }
  ];
});

// Format a row for registration history table
addFilter('formatHistoryRow', function(reg) {
  return [
    { text: reg.name },
    { text: reg.email },
    { text: reg.department },
    { 
      text: reg.status === 'approved' ? 'Approved' : 'Rejected',
      classes: reg.status === 'approved' ? 'govuk-tag' : 'govuk-tag govuk-tag--red'
    },
    { text: addFilter.date(reg.updated) }
  ];
});

addFilter('formatDate', (str) => {
  if (!str) return '';
  const date = new Date(str);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

addFilter('toFixed', (num, decimals = 1) => {
  if (num === null || num === undefined) return 'N/A';
  return Number(num).toFixed(decimals);
});