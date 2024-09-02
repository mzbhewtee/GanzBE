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

// Route to create a new table
app.post('/create-table', (req, res) => {
  const { tableName, columns } = req.body;

  if (!tableName || !columns) {
    return res.status(400).send('Table name and columns are required');
  }

  const columnsDefinition = columns.map(col => `${col.name} ${col.type}`).join(', ');
  const query = `CREATE TABLE ${tableName} (${columnsDefinition})`;

  pool.query(query, (err, results) => {
    if (err) {
      console.error(`Error creating table ${tableName}:`, err);
      return res.status(500).send(`Error creating table ${tableName}`);
    }
    res.status(201).send(`Table ${tableName} created successfully`);
  });
});

// Route to delete a table
app.delete('/delete-table/:tableName', (req, res) => {
  const tableName = req.params.tableName;

  if (!tableName) {
    return res.status(400).send('Table name is required');
  }

  const query = `DROP TABLE IF EXISTS ${tableName}`;

  pool.query(query, (err, results) => {
    if (err) {
      console.error(`Error deleting table ${tableName}:`, err);
      return res.status(500).send(`Error deleting table ${tableName}`);
    }
    res.send(`Table ${tableName} deleted successfully`);
  });
});

// Route to update data in a specific table
app.put('/update-table-data/:tableName', async (req, res) => {
  const tableName = req.params.tableName; // Get table name from the request parameters
  const updates = req.body.updates; // Array of update objects

  // Validate the inputs
  if (!tableName || !updates || !Array.isArray(updates)) {
    return res.status(400).send('Table name and updates are required');
  }

  const connection = await pool.getConnection(); // Get a connection from the pool
  try {
    // Iterate over each update object
    for (const update of updates) {
      const { id, ...fields } = update; // Destructure to get the ID and the rest of the fields
      
      // Validate that the ID is present
      if (!id) {
        return res.status(400).send('ID is required for each update');
      }

      // Construct the SQL query for updating the data
      const query = `UPDATE ${tableName} SET ` +
                    Object.keys(fields).map(key => `${key} = ?`).join(', ') +
                    ' WHERE id = ?';
      
      const values = [...Object.values(fields), id]; // Values array for the query

      // Log the query and values for debugging
      console.log('Executing query:', query);
      console.log('With values:', values);

      // Execute the update query
      await connection.query(query, values);
    }

    res.sendStatus(200); // Send success status
  } catch (error) {
    // Log the detailed error for debugging
    console.error(`Error updating data in table ${tableName}:`, error.message, 'Query:', query, 'Values:', values);
    res.status(500).send(`Internal Server Error updating data in table ${tableName}`);
  } finally {
    connection.release(); // Release the connection back to the pool
  }
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
