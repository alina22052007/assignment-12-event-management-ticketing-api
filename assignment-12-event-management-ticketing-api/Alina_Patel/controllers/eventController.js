const { db } = require('../config/firebaseConfig');

/**
 * Browse all upcoming events with optional category and city filters
 */
exports.getAllEvents = async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const nowIso = new Date().toISOString();

    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    let events = [];
    snapshot.forEach(doc => {
      events.push({ id: doc.id, ...doc.data() });
    });

    // Filter upcoming events (eventDate >= current date/time)
    events = events.filter(event => {
      if (!event.eventDate) return true;
      return new Date(event.eventDate).toISOString() >= nowIso;
    });

    // Apply category filter if provided
    if (category) {
      const catFilter = category.toLowerCase().trim();
      events = events.filter(e => e.category && e.category.toLowerCase() === catFilter);
    }

    // Apply city/venue filter if provided
    if (city) {
      const cityFilter = city.toLowerCase().trim();
      events = events.filter(e => e.venue && e.venue.toLowerCase().includes(cityFilter));
    }

    // Apply optional search query across title and description
    if (search) {
      const query = search.toLowerCase().trim();
      events = events.filter(e => 
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query))
      );
    }

    // Sort by earliest eventDate first
    events.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get All Events Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while retrieving events.'
    });
  }
};

/**
 * Get single event details with live available tickets count
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventDoc = await db.collection('events').doc(id).get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: eventDoc.id,
        ...eventDoc.data()
      }
    });
  } catch (error) {
    console.error('Get Event By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error retrieving event.'
    });
  }
};

/**
 * Create a new event listing (Organizer only)
 */
exports.createEvent = async (req, res) => {
  try {
    const { title, description, category, eventDate, venue, ticketPrice, totalCapacity } = req.body;
    const organizerId = req.user.id;
    const organizerName = req.user.name || 'Organizer';

    // Validate required fields
    if (!title || !description || !category || !eventDate || !venue || ticketPrice === undefined || totalCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, category, eventDate, venue, ticketPrice, and totalCapacity are required.'
      });
    }

    const price = Number(ticketPrice);
    const capacity = parseInt(totalCapacity, 10);

    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'ticketPrice must be a valid non-negative number.'
      });
    }

    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalCapacity must be an integer greater than 0.'
      });
    }

    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventDate format. Please provide a valid ISO date string.'
      });
    }

    const eventRef = db.collection('events').doc();
    const createdAt = new Date().toISOString();

    const newEvent = {
      id: eventRef.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      eventDate: parsedDate.toISOString(),
      venue: venue.trim(),
      organizerId,
      organizerName,
      ticketPrice: price,
      totalCapacity: capacity,
      availableTickets: capacity, // Available tickets initially equals total capacity
      createdAt
    };

    await eventRef.set(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: newEvent
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while creating event.'
    });
  }
};

/**
 * Update event details (Organizer only, must own the event)
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' was not found.`
      });
    }

    const eventData = eventDoc.data();

    // Ownership Verification
    if (eventData.organizerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this event.'
      });
    }

    const { title, description, category, eventDate, venue, ticketPrice, totalCapacity } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category.trim();
    if (venue !== undefined) updates.venue = venue.trim();

    if (ticketPrice !== undefined) {
      const price = Number(ticketPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'ticketPrice must be a valid non-negative number.'
        });
      }
      updates.ticketPrice = price;
    }

    if (eventDate !== undefined) {
      const parsedDate = new Date(eventDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid eventDate format.'
        });
      }
      updates.eventDate = parsedDate.toISOString();
    }

    if (totalCapacity !== undefined) {
      const newCapacity = parseInt(totalCapacity, 10);
      if (isNaN(newCapacity) || newCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'totalCapacity must be an integer greater than 0.'
        });
      }

      const bookedTickets = (eventData.totalCapacity || 0) - (eventData.availableTickets || 0);
      if (newCapacity < bookedTickets) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce totalCapacity to ${newCapacity} because ${bookedTickets} tickets are already booked.`
        });
      }

      updates.totalCapacity = newCapacity;
      updates.availableTickets = newCapacity - bookedTickets;
    }

    updates.updatedAt = new Date().toISOString();

    await eventRef.update(updates);

    const updatedDoc = await eventRef.get();
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while updating event.'
    });
  }
};

/**
 * Cancel and delete an event (Organizer only, must own the event)
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' was not found.`
      });
    }

    const eventData = eventDoc.data();

    // Ownership Verification
    if (eventData.organizerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this event.'
      });
    }

    await eventRef.delete();

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Event Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while deleting event.'
    });
  }
};

/**
 * List all attendees/tickets for an event (Organizer only, must own event)
 */
exports.getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' was not found.`
      });
    }

    const eventData = eventDoc.data();

    // Verify organizer owns the event
    if (eventData.organizerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view attendee rosters for your own events.'
      });
    }

    // Retrieve confirmed tickets for this event
    const ticketsSnapshot = await db.collection('tickets')
      .where('eventId', '==', id)
      .where('status', '==', 'confirmed')
      .get();

    const attendees = [];
    let totalTicketsSold = 0;
    let totalRevenue = 0;

    ticketsSnapshot.forEach(doc => {
      const ticket = { id: doc.id, ...doc.data() };
      attendees.push(ticket);
      totalTicketsSold += ticket.quantity || 0;
      totalRevenue += ticket.totalPaid || 0;
    });

    return res.status(200).json({
      success: true,
      event: {
        id: eventDoc.id,
        title: eventData.title,
        totalCapacity: eventData.totalCapacity,
        availableTickets: eventData.availableTickets,
        ticketsSold: totalTicketsSold,
        totalRevenue: totalRevenue
      },
      count: attendees.length,
      data: attendees
    });
  } catch (error) {
    console.error('Get Attendees Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error fetching attendees.'
    });
  }
};
