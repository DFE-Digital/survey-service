exports.up = function(knex) {
  return knex.schema.createTable('survey_waves', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('department_code').notNullable();
    table.string('name').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('status').notNullable().defaultTo('active');
    table.timestamps(true, true);

    // Add constraint to ensure end_date is after start_date
    table.check('??::date > ??::date', ['end_date', 'start_date'], 'check_dates_order');
    // Add constraint to ensure status is valid
    table.check('?? IN (\'active\', \'closed\')', ['status'], 'check_status_values');

    // Add index for department_code
    table.index('department_code');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('survey_waves');
}; 