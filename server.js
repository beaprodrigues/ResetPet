'use strict';

require('dotenv').config();
require('dotenv').config();

const { configuration } = require('./server/config');
const { app } = require('./server/app');

app.listen(configuration.port, () => {
  console.log(`ResetPet disponível em http://localhost:${configuration.port}`);
});