const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OCR System API',
      version: '1.0.0',
      description: 'API documentation for OCR System with authentication and file processing',
      contact: {
        name: 'OCR System Team',
        email: 'support@ocrsystem.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Firebase UID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            id: {
              type: 'integer',
              description: 'Database user ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            }
          }
        },
        OCRJob: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Job ID'
            },
            filename: {
              type: 'string',
              description: 'Original filename'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: 'Job status'
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Processing progress percentage'
            },
            result: {
              type: 'string',
              description: 'OCR result text'
            },
            error: {
              type: 'string',
              description: 'Error message if failed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation timestamp'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job completion timestamp'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalJobs: {
              type: 'integer',
              description: 'Total number of jobs'
            },
            completedJobs: {
              type: 'integer',
              description: 'Number of completed jobs'
            },
            failedJobs: {
              type: 'integer',
              description: 'Number of failed jobs'
            },
            successRate: {
              type: 'number',
              description: 'Success rate percentage'
            },
            averageProcessingTime: {
              type: 'number',
              description: 'Average processing time in minutes'
            },
            totalUsers: {
              type: 'integer',
              description: 'Total number of users (admin only)'
            },
            activeUsers: {
              type: 'integer',
              description: 'Number of active users (admin only)'
            },
            revenue: {
              type: 'number',
              description: 'Total revenue (admin only)'
            },
            systemUptime: {
              type: 'number',
              description: 'System uptime percentage'
            },
            cpuUsage: {
              type: 'number',
              description: 'CPU usage percentage'
            },
            memoryUsage: {
              type: 'number',
              description: 'Memory usage percentage'
            },
            storageUsage: {
              type: 'number',
              description: 'Storage usage percentage'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs; 