const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config(); // For loading environment variables

const app = express();
const port = process.env.PORT || 5000; // Use environment variable or default to 5000

app.use(cors());
app.use(express.json());

// Create a MySQL connection pool using Clever Cloud credentials
const db = mysql.createPool({
  connectionLimit: 10, // Set the maximum number of connections in the pool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
  connection.release(); // Release the connection back to the pool
});

// Define an API route to get land use data
app.get('/land', (req, res) => {
  db.query('SELECT * FROM landuseoverview_rwanda', (err, results) => {
    if (err) {
      console.error('Error fetching data from landuseoverview_rwanda:', err);
      res.status(500).send('Error fetching data from landuseoverview_rwanda');
      return;
    }
    res.json(results);
  });
});

// Define an API route to get climate data
app.get('/climate', (req, res) => {
  db.query('SELECT * FROM climatechangeemissions', (err, results) => {
    if (err) {
      console.error('Error fetching data from climatechangeemissions:', err);
      res.status(500).send('Error fetching data from climatechangeemissions');
      return;
    }
    res.json(results);
  });
});

// Define an API route to get agriculture data
app.get('/agriculture', (req, res) => {
  db.query('SELECT * FROM agriculture_data', (err, results) => {
    if (err) {
      console.error('Error fetching data from agriculture_data:', err);
      res.status(500).send('Error fetching data from agriculture_data');
      return;
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
