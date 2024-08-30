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

// Route to add a new table to the database
app.post('/add-table', (req, res) => {
  const { tableName, columns } = req.body;

  // Construct the CREATE TABLE query
  let createTableQuery = `CREATE TABLE ${tableName} (`;
  const columnDefinitions = columns.map(
    (col) => `${col.name} ${col.type} ${col.notNull ? 'NOT NULL' : ''} ${col.autoIncrement ? 'AUTO_INCREMENT' : ''}`
  );
  createTableQuery += columnDefinitions.join(', ') + ');';

  pool.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating table:', err);
      return res.status(500).send('Error creating table');
    }
    res.send(`Table ${tableName} created successfully`);
  });
});

// Route to edit an existing table
app.put('/edit-table', (req, res) => {
  const { tableName, oldColumnName, newColumnName, newType } = req.body;

  // Construct the ALTER TABLE query
  const alterTableQuery = `ALTER TABLE ${tableName} CHANGE ${oldColumnName} ${newColumnName} ${newType};`;

  pool.query(alterTableQuery, (err, results) => {
    if (err) {
      console.error('Error modifying table:', err);
      return res.status(500).send('Error modifying table');
    }
    res.send(`Table ${tableName} modified successfully`);
  });
});

// Route to delete an existing table
app.delete('/delete-table', (req, res) => {
  const { tableName } = req.body;

  // Construct the DROP TABLE query
  const dropTableQuery = `DROP TABLE ${tableName};`;

  pool.query(dropTableQuery, (err, results) => {
    if (err) {
      console.error('Error deleting table:', err);
      return res.status(500).send('Error deleting table');
    }
    res.send(`Table ${tableName} deleted successfully`);
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
