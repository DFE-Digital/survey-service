exports.up = function(knex) {
  return knex.schema.createTable('sessions', function(table) {
    table.string('sid').primary();
    table.jsonb('sess').notNullable();
    table.timestamp('expire').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sessions');
}; 