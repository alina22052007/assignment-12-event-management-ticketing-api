const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { bookingRateLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /api/tickets/book:
 *   post:
 *     summary: Atomic ticket booking (Concurrency safe and Rate limited)
 *     description: "Attendee Only. Books tickets atomically using Firestore ACID transactions (runTransaction). Guaranteed zero overselling under flash-sale concurrency. Rate limited to 10 requests per minute."
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TicketBookingRequest'
 *     responses:
 *       201:
 *         description: Tickets booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Tickets booked successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Insufficient inventory, event not found, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardError'
 *       429:
 *         description: Rate limit exceeded (Maximum 10 booking requests per minute)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardError'
 */
router.post(
  '/book',
  authMiddleware,
  checkRole('attendee'),
  bookingRateLimiter,
  ticketController.bookTicket
);

/**
 * @swagger
 * /api/tickets/my-tickets:
 *   get:
 *     summary: Retrieve tickets booked by current attendee
 *     description: "Attendee Only. Retrieve full purchase history and active tickets for the authenticated attendee."
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Attendee ticket records returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Role must be attendee
 */
router.get(
  '/my-tickets',
  authMiddleware,
  checkRole('attendee'),
  ticketController.getMyTickets
);

/**
 * @swagger
 * /api/tickets/{id}/cancel:
 *   post:
 *     summary: Cancel ticket booking and restore inventory
 *     description: "Attendee Only. Cancels a confirmed ticket and uses a Firestore ACID transaction to automatically restore the exact ticket quantity back into the event availableTickets inventory."
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The Firestore Document ID of the ticket"
 *         example: "ticket_rec_88219"
 *     responses:
 *       200:
 *         description: Ticket cancelled and inventory successfully restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Ticket cancelled successfully and ticket inventory restored.'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 'ticket_rec_88219'
 *                     bookingRef:
 *                       type: string
 *                       example: 'TKT-2026-88219'
 *                     status:
 *                       type: string
 *                       example: 'cancelled'
 *                     quantityRestored:
 *                       type: integer
 *                       example: 2
 *                     cancelledAt:
 *                       type: string
 *                       example: '2026-03-02T18:00:00.000Z'
 *       400:
 *         description: Ticket already cancelled or invalid state
 *       403:
 *         description: Forbidden - Cannot cancel another user ticket
 *       404:
 *         description: Ticket not found
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  checkRole('attendee'),
  ticketController.cancelTicket
);

module.exports = router;
