const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Browse all upcoming events
 *     description: "Retrieve all upcoming events with optional filtering by category, city or venue, and search keywords."
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: "Filter events by category (e.g., Technology, Music, Sports)"
 *         example: "Technology"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: "Filter events by city or venue location keyword"
 *         example: "Mumbai"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Search keyword across title and description"
 *     responses:
 *       200:
 *         description: List of upcoming events
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
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/', eventController.getAllEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event details and live ticket availability
 *     description: "Retrieve detailed metadata for a single event along with its real-time available ticket inventory."
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The Firestore Document ID of the event"
 *         example: "event_techconf_2026"
 *     responses:
 *       200:
 *         description: Event details returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardError'
 */
router.get('/:id', eventController.getEventById);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event listing
 *     description: "Organizer Only. Publish a new event. The organizerId is automatically attached from the JWT token, and availableTickets is initialized to match totalCapacity."
 *     tags:
 *       - Events
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreateRequest'
 *     responses:
 *       201:
 *         description: Event created successfully
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
 *                   example: 'Event created successfully.'
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Missing or invalid request parameters
 *       401:
 *         description: Unauthorized token
 *       403:
 *         description: Forbidden - Role must be organizer
 */
router.post('/', authMiddleware, checkRole('organizer'), eventController.createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an existing event listing
 *     description: "Organizer Only. Update event details. Organizers are strictly restricted to modifying events they created."
 *     tags:
 *       - Events
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The Firestore Document ID of the event"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventUpdateRequest'
 *     responses:
 *       200:
 *         description: Event updated successfully
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
 *                   example: 'Event updated successfully.'
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       403:
 *         description: Forbidden - Not the event creator
 *       404:
 *         description: Event not found
 */
router.put('/:id', authMiddleware, checkRole('organizer'), eventController.updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Cancel and delete an event listing
 *     description: "Organizer Only. Permanently delete an event listing owned by the authenticated organizer."
 *     tags:
 *       - Events
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The Firestore Document ID of the event"
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardSuccess'
 *       403:
 *         description: Forbidden - Not the event creator
 *       404:
 *         description: Event not found
 */
router.delete('/:id', authMiddleware, checkRole('organizer'), eventController.deleteEvent);

/**
 * @swagger
 * /api/events/{id}/attendees:
 *   get:
 *     summary: List registered attendees for an event
 *     description: "Organizer Only. Inspect the confirmed attendee roster, tickets sold, and total revenue for an event owned by the organizer."
 *     tags:
 *       - Events
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The Firestore Document ID of the event"
 *     responses:
 *       200:
 *         description: Attendee roster retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 'event_techconf_2026'
 *                     title:
 *                       type: string
 *                       example: 'Global Cloud & AI Summit 2026'
 *                     totalCapacity:
 *                       type: integer
 *                       example: 500
 *                     availableTickets:
 *                       type: integer
 *                       example: 482
 *                     ticketsSold:
 *                       type: integer
 *                       example: 18
 *                     totalRevenue:
 *                       type: number
 *                       example: 26982
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *       403:
 *         description: Forbidden - Not the event organizer
 *       404:
 *         description: Event not found
 */
router.get('/:id/attendees', authMiddleware, checkRole('organizer'), eventController.getEventAttendees);

module.exports = router;
