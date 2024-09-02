const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json()); // For parsing application/json
app.use(cors()); // Enable CORS for all routes

const pool = mysql.createPool({
    host: 'localhost',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Route to fetch table names
app.get('/tables', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SHOW TABLES');
        connection.release();
        const tableNames = rows.map(row => Object.values(row)[0]);
        res.json(tableNames);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to fetch data from a specific table
app.get('/table-data/:tableName', async (req, res) => {
    const tableName = req.params.tableName;
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error(`Error fetching data from table ${tableName}:`, error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update data in a specific table
app.put('/update-table-data/:tableName', async (req, res) => {
    const tableName = req.params.tableName;
    const updates = req.body.updates; // Array of update objects

    if (!tableName || !updates || !Array.isArray(updates)) {
        return res.status(400).send('Table name and updates are required');
    }

    const connection = await pool.getConnection();
    try {
        for (const update of updates) {
            const { id, ...fields } = update; // Destructure to get the ID and the rest of the fields

            const query = `UPDATE ${tableName} SET ` +
                        Object.keys(fields).map(key => `${key} = ?`).join(', ') +
                        ' WHERE id = ?';
            
            const values = [...Object.values(fields), id]; // Values array for the query

            await connection.query(query, values); // Execute the update query
        }

        res.sendStatus(200); // Send success status
    } catch (error) {
        console.error(`Error updating data in table ${tableName}:`, error);
        res.status(500).send(`Internal Server Error updating data in table ${tableName}`);
    } finally {
        connection.release(); // Release the connection back to the pool
    }
});

// Route to create a new table
app.post('/create-table', async (req, res) => {
    const { tableName, columns } = req.body;

    if (!tableName || !columns || !Array.isArray(columns) || columns.length === 0) {
        return res.status(400).send('Table name and columns are required');
    }

    try {
        const connection = await pool.getConnection();
        const columnDefinitions = columns.map(col => `${col.name} ${col.type}`).join(', ');
        const query = `CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, ${columnDefinitions})`;
        await connection.query(query);
        connection.release();
        res.sendStatus(201); // Created
    } catch (error) {
        console.error('Error creating table:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to delete a table
app.delete('/delete-table/:tableName', async (req, res) => {
    const tableName = req.params.tableName;

    if (!tableName) {
        return res.status(400).send('Table name is required');
    }

    try {
        const connection = await pool.getConnection();
        await connection.query(`DROP TABLE ${tableName}`);
        connection.release();
        res.sendStatus(200); // OK
    } catch (error) {
        console.error('Error deleting table:', error);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
