const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config(); // For loading environment variables

const app = express();
const port = process.env.PORT || 5000; // Use environment variable or default to 5000

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit as needed
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase limit as needed

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

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

// Route to update table data
app.put('/:tableName', (req, res) => {
  const tableName = req.params.tableName;
  const data = req.body; // Expecting an array of objects with unique identifying fields

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).send('Invalid data format.');
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      return res.status(500).send('Error updating table data');
    }

    connection.beginTransaction((err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        connection.release();
        return res.status(500).send('Error updating table data');
      }

      let queriesCompleted = 0;

      data.forEach(row => {
        const uniqueColumns = Object.keys(row).filter(col => col !== 'updateField');
        const updateFields = Object.keys(row).filter(col => col === 'updateField');
        
        if (uniqueColumns.length === 0 || updateFields.length === 0) {
          connection.rollback(() => {
            connection.release();
            return res.status(400).send('No unique columns or update fields specified.');
          });
        }

        const conditions = uniqueColumns.map(col => `${col} = ?`).join(' AND ');
        const updates = updateFields.map(col => `${col} = ?`).join(', ');
        const values = [...uniqueColumns.map(col => row[col]), ...updateFields.map(col => row[col])];
        
        const query = `UPDATE ?? SET ${updates} WHERE ${conditions}`;
        connection.query(query, [tableName, ...values], (err) => {
          if (err) {
            console.error('Error updating row:', err);
            connection.rollback(() => {
              connection.release();
              return res.status(500).send('Error updating table data');
            });
          }

          queriesCompleted++;
          if (queriesCompleted === data.length) {
            connection.commit((err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                connection.rollback(() => {
                  connection.release();
                  return res.status(500).send('Error updating table data');
                });
              }
              connection.release();
              res.send('Table data updated successfully');
            });
          }
        });
      });
    });
  });
});

// Route to upload a file
app.post('/upload', upload.single('file'), (req, res) => {
  // Handle the uploaded file (req.file) and process it
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  // Process the file (e.g., parse CSV)
  // ...

  res.send('File uploaded successfully');
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
