// backend-nodejs/server.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { connectDB } = require('./db');
const authRoutes = require('./routes/authRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const dashboardRoutes = require('./routes/dashboardRouter');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3001; // Backend will run on port 3001 by default

// Connect to Database
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // อนุญาตเฉพาะ Frontend ที่รันอยู่บน http://localhost:3000
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
}));
app.use(express.json()); // สำหรับ parsing application/json (req.body)

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OCR System API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic home route for testing server status
app.get('/', (req, res) => {
    res.send('OCR Node.js Backend is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});