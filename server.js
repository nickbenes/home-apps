// Root server — delegates to the todos project server.
// For finance, run: npm run finance:dev
module.exports = require('./projects/todos/backend/server');

if (require.main === module) {
  require('./projects/todos/backend/server');
}
