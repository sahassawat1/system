const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'OCRSystem',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    port: parseInt(process.env.DB_PORT, 10) || 1433
};

const connectDB = async () => {
    try {
        console.log('Connecting to database...');
        console.log('Database config:', {
            server: config.server,
            database: config.database,
            user: config.user
        });
        
        await sql.connect(config);
        console.log('✅ Database connected successfully');
        
        // Test query to verify connection
        const result = await sql.query('SELECT 1 as test');
        console.log('✅ Database test query successful');
        
        // Create Users table if it doesn't exist
        await createUsersTable();
        
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Database error details:', {
            code: err.code,
            state: err.state,
            class: err.class
        });
        throw err;
    }
};

const createUsersTable = async () => {
    try {
        console.log('Checking if Users table exists...');
        
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                firebase_uid NVARCHAR(255) UNIQUE NOT NULL,
                email NVARCHAR(255) NOT NULL,
                username NVARCHAR(255) NOT NULL,
                role NVARCHAR(50) DEFAULT 'user',
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        `;
        
        await sql.query(createTableQuery);
        console.log('✅ Users table ready');
        
        // Create admin user if not exists
        await createDefaultAdmin();
        
    } catch (error) {
        console.error('❌ Error creating Users table:', error);
        throw error;
    }
};

const createDefaultAdmin = async () => {
    try {
        console.log('Checking for default admin user...');
        
        const checkAdminQuery = `
            SELECT COUNT(*) as count FROM Users WHERE role = 'admin'
        `;
        
        const result = await sql.query(checkAdminQuery);
        
        if (result.recordset[0].count === 0) {
            console.log('Creating default admin user...');
            
            const createAdminQuery = `
                INSERT INTO Users (firebase_uid, email, username, role)
                VALUES ('admin-default', 'admin@example.com', 'admin', 'admin')
            `;
            
            await sql.query(createAdminQuery);
            console.log('✅ Default admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }
        
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
};

// Export sql object and connectDB function
module.exports = {
    sql,
    connectDB
};