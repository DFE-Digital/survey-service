exports.seed = function(knex) {
  // First delete any existing admin user
  return knex('users')
    .where('email', 'andy.jones@education.gov.uk')
    .del()
    .then(function () {
      // Then insert the admin user
      return knex('users').insert({
        email: 'andy.jones@education.gov.uk',
        first_name: 'Andy',
        last_name: 'Jones',
        department_code: 'D6',
        is_approved: true,
        is_admin: true,
        is_org_owner: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    });
}; 