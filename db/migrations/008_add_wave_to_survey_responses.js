exports.up = function(knex) {
  return knex.schema.alterTable('survey_responses', table => {
    table.uuid('survey_wave_id')
      .references('id')
      .inTable('survey_waves')
      .onDelete('SET NULL');
    
    // Add index for querying responses by wave
    table.index(['survey_wave_id', 'submitted_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('survey_responses', table => {
    table.dropIndex(['survey_wave_id', 'submitted_at']);
    table.dropColumn('survey_wave_id');
  });
}; 