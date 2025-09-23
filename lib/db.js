/**
 * Enhanced Questionnaire Database Helper
 * PostgreSQL connection and query utilities
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Create connection using Neon
const sql = neon(process.env.DATABASE_URL);

/**
 * Execute a database query
 * @param {string} query - SQL query string
 * @param {any[]} params - Query parameters
 * @returns {Promise<any>} Query result
 */
async function db(query, params = []) {
  try {
    return await sql(query, params);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Execute a parameterized query with template literals
 * @param {TemplateStringsArray} strings 
 * @param {...any} values 
 * @returns {Promise<any>}
 */
async function dbQuery(strings, ...values) {
  try {
    return await sql(strings, ...values);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  db,
  dbQuery,
  sql
};