const pg = require('pg')
const express = require('express')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(require('morgan')('dev'))

const { Client } = pg

const client = new Client(process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory_db')

app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = `
            SELECT * FROM departments;
        `
        const { rows } = await client.query(SQL)
        res.send(rows)
    } catch (error) {
        next(error)
    }
})
app.get('/api/employees', async (req, res, next) => {
    try {
        const SQL = `
            SELECT * FROM employees;
        `
        const { rows } = await client.query(SQL)
        res.send(rows)
    } catch (error) {
        next(error)
    }
})
app.post('/api/employees', async (req, res, next) => {
    try {
        const SQL = `
            INSERT INTO employees(name, department_id)
            VALUES($1, $2)
            RETURNING *;

        `
        const result = await client.query(SQL, [req.body.name, req.body.department_id])
        res.status(201).send(result.rows[0])
    } catch (error) {
        next(error)
    }
})
app.put('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `
            UPDATE employees
            SET name = $1, department_id = $2, updated_at = now()
            WHERE id = $3 RETURNING *;
        `
        const result = await client.query(SQL, [req.body.name, req.body.department_id, req.params.id])
        res.send(result.rows[0])
    } catch (error) {
        next(error)
    }
})
app.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `
            DELETE FROM employees WHERE id = $1;
        `
        await client.query(SQL, [req.params.id])
        res.sendStatus(204)
    } catch (error) {
        next(error)
    }
})

const init = async () => {
    await client.connect()

    let SQL = `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;
        CREATE TABLE departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
        );
        CREATE TABLE employees (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            name VARCHAR(255) NOT NULL,
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );

        `
    await client.query(SQL)
    console.log('tables created')
    SQL = `
            INSERT INTO departments(name) VALUES('Accounting');
            INSERT INTO departments(name) VALUES('Customer Service');
            INSERT INTO departments(name) VALUES('Management');
            INSERT INTO employees (name, department_id)
                VALUES('Mark Smith', (SELECT id FROM departments WHERE name = 'Accounting'));
            INSERT INTO employees (name, department_id)
                VALUES('Jack Taylor', (SELECT id FROM departments WHERE name = 'Customer Service'));
            INSERT INTO employees (name, department_id)
                VALUES('Max Washington', (SELECT id FROM departments WHERE name = 'Management'));
        `
    await client.query(SQL)
    console.log('data seeded')
    app.listen(port, () => {
        console.log('server listening on port: ' + port)
    })
}

init()