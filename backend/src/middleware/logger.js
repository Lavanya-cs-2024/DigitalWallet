// middleware/logger.js
const logger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`📥 ${req.method} ${req.url} - ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${statusColor} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
};

module.exports = { logger };