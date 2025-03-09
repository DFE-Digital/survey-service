/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // User details
    table.string('email').notNullable().unique();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    
    // Department info
    table.string('department_code').notNullable();
    table.string('department_name').notNullable();
    
    // Role flags
    table.boolean('is_approved').notNullable().defaultTo(false);
    table.boolean('is_admin').notNullable().defaultTo(false);
    table.boolean('is_org_owner').notNullable().defaultTo(false);
    
    // Timestamps
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
}; 