/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('survey_feedback', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Survey response reference
    table.uuid('survey_response_id').notNullable()
      .references('id')
      .inTable('survey_responses')
      .onDelete('CASCADE');
    
    // Feedback details
    table.string('role').nullable();
    table.string('grade').nullable();
    table.text('feedback').nullable();
    
    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('survey_response_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('survey_feedback');
}; 