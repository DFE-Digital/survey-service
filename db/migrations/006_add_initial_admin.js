/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex('users').insert({
    email: 'andy.jones@education.gov.uk',
    first_name: 'Andy',
    last_name: 'Jones',
    department_code: 'D6',
    department_name: 'Department for Education',
    is_approved: true,
    is_admin: true,
    is_org_owner: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex('users')
    .where('email', 'andy.jones@education.gov.uk')
    .del();
}; 