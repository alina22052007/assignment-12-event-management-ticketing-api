const { db } = require('../config/firebaseConfig');

/**
 * Atomic Ticket Booking with ACID Concurrency Guarantee
 * Decrements availableTickets and creates ticket record inside a single Firestore transaction.
 */
exports.bookTicket = async (req, res) => {
  const { eventId, quantity, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;

  // Input Validation
  if (!eventId || !quantity || !attendeeName || !attendeeEmail) {
    return res.status(400).json({
      success: false,
      message: 'All fields (eventId, quantity, attendeeName, attendeeEmail) are required.'
    });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be a positive integer greater than 0.'
    });
  }

  if (qty > 10) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 10 tickets can be purchased in a single transaction.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(attendeeEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid attendee email format provided.'
    });
  }

  const eventRef = db.collection('events').doc(eventId);
  const ticketRef = db.collection('tickets').doc();

  try {
    const result = await db.runTransaction(async (t) => {
      // 1. Read event inside transaction
      const eventDoc = await t.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();

      // 2. Prevent booking for past events
      if (eventData.eventDate && new Date(eventData.eventDate) < new Date()) {
        throw new Error('Cannot book tickets for an event that has already concluded');
      }

      // 3. Concurrency check: Ensure inventory is available
      if (eventData.availableTickets < qty) {
        throw new Error(`Insufficient tickets available. Only ${eventData.availableTickets} remaining.`);
      }

      // 4. Atomically decrement available tickets
      t.update(eventRef, {
        availableTickets: eventData.availableTickets - qty
      });

      // 5. Generate human-readable booking reference code
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const bookingRef = `TKT-${new Date().getFullYear()}-${randomSuffix}`;

      // 6. Create new ticket document
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        userId,
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.toLowerCase().trim(),
        quantity: qty,
        totalPaid: qty * (eventData.ticketPrice || 0),
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString()
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    return res.status(201).json({
      success: true,
      message: 'Tickets booked successfully',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete ticket booking.'
    });
  }
};

/**
 * Retrieve all tickets purchased by the authenticated attendee
 */
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .get();

    if (ticketsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const tickets = [];
    ticketsSnapshot.forEach(doc => {
      tickets.push({ id: doc.id, ...doc.data() });
    });

    // Sort by most recent booking first
    tickets.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get My Tickets Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error retrieving your tickets.'
    });
  }
};

/**
 * Cancel a ticket booking and restore inventory to the event atomically
 */
exports.cancelTicket = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ticketRef = db.collection('tickets').doc(id);

  try {
    const result = await db.runTransaction(async (t) => {
      // 1. Fetch ticket inside transaction
      const ticketDoc = await t.get(ticketRef);
      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      // 2. Ownership verification
      if (ticketData.userId !== userId) {
        throw new Error('Forbidden: You can only cancel tickets booked under your account');
      }

      // 3. Status check
      if (ticketData.status === 'cancelled') {
        throw new Error('This ticket is already cancelled');
      }

      // 4. Fetch event and restore inventory
      const eventRef = db.collection('events').doc(ticketData.eventId);
      const eventDoc = await t.get(eventRef);

      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        const maxCapacity = eventData.totalCapacity || 999999;
        const restoredAvailable = Math.min(maxCapacity, (eventData.availableTickets || 0) + ticketData.quantity);

        t.update(eventRef, {
          availableTickets: restoredAvailable
        });
      }

      // 5. Mark ticket as cancelled
      const cancelledAt = new Date().toISOString();
      t.update(ticketRef, {
        status: 'cancelled',
        cancelledAt
      });

      return {
        id: ticketDoc.id,
        bookingRef: ticketData.bookingRef,
        status: 'cancelled',
        quantityRestored: ticketData.quantity,
        cancelledAt
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully and ticket inventory restored.',
      data: result
    });
  } catch (error) {
    const status = error.message.startsWith('Forbidden') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to cancel ticket.'
    });
  }
};
