/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('survey_responses', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Organization info
    table.string('department_code').notNullable();
    table.string('organization_name').notNullable();
    
    // Survey data
    table.jsonb('answers').notNullable().defaultTo('{}');
    table.jsonb('theme_scores').nullable();
    table.decimal('overall_score', 5, 2).nullable();
    
    // Survey status
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('submitted_at').nullable();
    
    // Optional user reference (if they were logged in)
    table.uuid('user_id').nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    
    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index(['department_code', 'submitted_at']);
    table.index(['user_id', 'submitted_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('survey_responses');
}; 