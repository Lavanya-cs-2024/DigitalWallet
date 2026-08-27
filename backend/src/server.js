// server.js
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Start the server
        const server = app.listen(PORT, () => {
            console.log('=================================');
            console.log('🚀 Digital Wallet API Server');
            console.log('=================================');
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`📝 Health check: http://localhost:${PORT}/health`);
            console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('=================================');
            console.log('✅ Server is ready to accept requests');
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
            
            // Close server
            server.close(async () => {
                console.log('✅ HTTP server closed');
                
                // Disconnect database
                await prisma.$disconnect();
                console.log('✅ Database disconnected');
                
                process.exit(0);
            });

            // Force close after timeout
            setTimeout(() => {
                console.error('❌ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();