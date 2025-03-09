/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('registration_requests', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // User details
    table.string('email').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    
    // Department info
    table.string('department_code').notNullable();
    table.string('department_name').notNullable();
    
    // Request details
    table.string('status').notNullable().defaultTo('pending');
    table.string('role').nullable();
    table.string('grade').nullable();
    table.text('reason').nullable();
    
    // Approval details
    table.uuid('approved_by').nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('approved_at').nullable();
    
    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index(['email', 'status']);
    table.index(['department_code', 'status']);
    table.index('approved_by');

    // Constraints
    table.unique(['email', 'department_code', 'status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('registration_requests');
}; 