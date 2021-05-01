const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const authRouter = require('./auth/authRouter.js');
const login = require('./auth/login.js');

const PORT = process.env.PORT || 5000
const dbUrl = process.env.MONGO_URL

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(authRouter);

function start(PORT) {
  mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    await app.listen(PORT, () => {
      // console.log(`Server is up on port: ${PORT}`);
    })
  })
  .catch((err) => { console.error(`Could not start server: `, err.message) })
}

start(PORT);
login();
