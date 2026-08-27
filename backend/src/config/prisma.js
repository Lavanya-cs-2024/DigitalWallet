// config/prisma.js
const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error']
});

// Handle connection events
prisma.$on('connect', () => {
    console.log('✅ Database connected successfully');
});

prisma.$on('error', (error) => {
    console.error('❌ Database error:', error.message);
});

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;