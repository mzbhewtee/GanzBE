const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config(); // For loading environment variables

const app = express();
const port = process.env.PORT || 5000; // Use environment variable or default to 5000

app.use(cors());
app.use(express.json());

// Create a MySQL connection pool
const pool = mysql.createPool({
  connectionLimit: 10, // Set the maximum number of connections in the pool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
  connection.release(); // Release the connection back to the pool
});

// Route to get all table names
app.get('/tables', (req, res) => {
  pool.query("SHOW TABLES", (err, results) => {
    if (err) {
      console.error('Error fetching table names:', err);
      return res.status(500).send('Error fetching table names');
    }
    const tables = results.map(row => Object.values(row)[0]);
    res.json(tables);
  });
});

// Route to get data from a specific table
app.get('/table-data/:tableName', (req, res) => {
  const tableName = req.params.tableName;

  pool.query(`SELECT * FROM ${tableName}`, (err, results) => {
    if (err) {
      console.error(`Error fetching data from ${tableName}:`, err);
      return res.status(500).send(`Error fetching data from ${tableName}`);
    }
    res.json(results);
  });
});

// Route to update data in a specific table
app.put('/update-table-data', (req, res) => {
  const { tableName, data } = req.body;

  // Generate the UPDATE query based on the data
  const updates = data.map(row => {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const setClause = columns.map((col, i) => `${col} = ?`).join(', ');
    return `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
  });

  pool.query(updates.join('; '), values.flat().concat(ids), (err, results) => {
    if (err) {
      console.error('Error updating table data:', err);
      return res.status(500).send('Error updating table data');
    }
    res.send('Table data updated successfully');
  });
});

// Define a route to fetch data from any agriculture table
app.get('/agriculture/:dataset', (req, res) => {
  const dataset = req.params.dataset;
  const validTables = [
    'agriculture_data',
    'agriculture_kenya',
    'agriculture_nigeria',
    'agriculture_rwanda',
    'agriculture_southafrica'
  ];

  if (!validTables.includes(dataset)) {
    return res.status(400).send('Invalid dataset specified');
  }

  pool.query(`SELECT * FROM ${dataset}`, (err, results) => {
    if (err) {
      console.error(`Error fetching data from ${dataset}:`, err);
      return res.status(500).send(`Error fetching data from ${dataset}`);
    }
    res.json(results);
  });
});

// Define a route to fetch climate data
app.get('/climate/:dataset', (req, res) => {
  const dataset = req.params.dataset;
  const validTables = [
    'climate_kenya',
    'climate_nigeria',
    'climate_rwanda',
    'climate_southafrica'
  ];

  if (!validTables.includes(dataset)) {
    return res.status(400).send('Invalid dataset specified');
  }

  pool.query(`SELECT * FROM ${dataset}`, (err, results) => {
    if (err) {
      console.error(`Error fetching data from ${dataset}:`, err);
      return res.status(500).send(`Error fetching data from ${dataset}`);
    }
    res.json(results);
  });
});

// Define a route to fetch land use data
app.get('/land', (req, res) => {
  pool.query('SELECT * FROM landuseoverview_rwanda', (err, results) => {
    if (err) {
      console.error('Error fetching data from landuseoverview_rwanda:', err);
      return res.status(500).send('Error fetching data from landuseoverview_rwanda');
    }
    res.json(results);
  });
});

// Define a route to fetch climate change emissions data
app.get('/climatechangeemissions', (req, res) => {
  pool.query('SELECT * FROM climatechangeemissions', (err, results) => {
    if (err) {
      console.error('Error fetching data from climatechangeemissions:', err);
      return res.status(500).send('Error fetching data from climatechangeemissions');
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
