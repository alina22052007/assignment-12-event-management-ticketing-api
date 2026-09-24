const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Ticket Booking Endpoints
 * Prevents ticket scalpers, automated purchasing bots, and rapid hammering
 * Max: 10 requests per 60 seconds per IP
 */
const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 booking requests per windowMs
  standardHeaders: true, // Return standard rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many booking attempts. Rate limit exceeded (10 requests per minute). Please try again shortly.'
    });
  }
});

/**
 * General API Rate Limiter
 * Provides baseline DDoS and flood protection across general endpoints
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this client. Please slow down and try again later.'
    });
  }
});

module.exports = {
  bookingRateLimiter,
  generalRateLimiter
};
