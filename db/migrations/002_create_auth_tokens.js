/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('auth_tokens', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // User reference
    table.uuid('user_id').notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    
    // Token details
    table.string('token', 1024).notNullable().unique();
    table.string('type').notNullable();
    table.boolean('used').notNullable().defaultTo(false);
    table.timestamp('expires_at').notNullable();
    
    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'type']);
    table.index(['token', 'type']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('auth_tokens');
}; 