const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Event Management & High-Concurrency Ticketing API',
    version: '1.0.0',
    description: `
### 🎟️ High-Concurrency Event Ticketing & Live Booking REST API
Engineered with **Node.js**, **Express.js**, and **Google Cloud Firestore**.

---

### 🔑 Key Features
* **ACID Transactions:** Powered by Firestore \`runTransaction()\` guaranteeing atomic inventory decrements and zero overselling during flash-sale concurrency.
* **Role-Based Access Control (RBAC):** Strict JWT separation between \`organizer\` (creates/manages events & attendee rosters) and \`attendee\` (books tickets & views passes).
* **Anti-Scalper & Anti-Bot Protection:** Hardened rate limiting on booking routes using \`express-rate-limit\` (10 requests/minute per client).
* **Search & Discovery:** Public event querying by category, city/venue, and real-time live seat counts.
* **Booking Lifecycle:** Atomic booking generation with unique reference codes (\`TKT-XXXXXX\`) and automated inventory restoration upon cancellation.

---
### 🔐 Authentication Instructions
1. Register or log in via the **/api/auth** endpoints.
2. Copy the returned \`token\`.
3. Click the **Authorize** button at the top right, paste your token in the Value field, and click **Authorize**.
    `,
    contact: {
      name: 'Kartik Wagh',
      email: 'kartik.wagh@example.com'
    },
    license: {
      name: 'ISC'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    },
    {
      url: 'https://itm-assignment-12-event-ticketing-api.onrender.com',
      description: 'Production Render Deployment'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>'
      }
    },
    schemas: {
      StandardSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' }
        }
      },
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid request or resource not found' },
          errors: {
            type: 'array',
            items: { type: 'string' },
            example: []
          }
        }
      },
      UserRegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string', example: 'Kunal Sharma' },
          email: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
          password: { type: 'string', format: 'password', minLength: 6, example: 'Pass1234' },
          role: {
            type: 'string',
            enum: ['attendee', 'organizer'],
            example: 'attendee',
            description: 'User access role'
          }
        }
      },
      UserLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
          password: { type: 'string', format: 'password', example: 'Pass1234' }
        }
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr_attendee_99' },
          name: { type: 'string', example: 'Kunal Sharma' },
          email: { type: 'string', example: 'kunal@gmail.com' },
          role: { type: 'string', example: 'attendee' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' }
        }
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'event_techconf_2026' },
          title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
          description: { type: 'string', example: 'Annual flagship backend conference featuring distributed systems and cloud architecture.' },
          category: { type: 'string', example: 'Technology' },
          eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00.000Z' },
          venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
          organizerId: { type: 'string', example: 'usr_organizer_01' },
          organizerName: { type: 'string', example: 'TechEvents Global' },
          ticketPrice: { type: 'number', example: 1499 },
          totalCapacity: { type: 'integer', example: 500 },
          availableTickets: { type: 'integer', example: 482 },
          createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T12:00:00.000Z' }
        }
      },
      EventCreateRequest: {
        type: 'object',
        required: ['title', 'description', 'category', 'eventDate', 'venue', 'ticketPrice', 'totalCapacity'],
        properties: {
          title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
          description: { type: 'string', example: 'Annual flagship backend conference featuring distributed systems and cloud architecture.' },
          category: { type: 'string', example: 'Technology' },
          eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
          venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
          ticketPrice: { type: 'number', minimum: 0, example: 1499 },
          totalCapacity: { type: 'integer', minimum: 1, example: 500 }
        }
      },
      EventUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Global Cloud & AI Summit 2026 (Updated)' },
          description: { type: 'string', example: 'Updated keynote speakers and schedule.' },
          category: { type: 'string', example: 'Technology' },
          eventDate: { type: 'string', format: 'date-time', example: '2026-06-16T09:00:00Z' },
          venue: { type: 'string', example: 'Jio World Convention Centre, BKC, Mumbai' },
          ticketPrice: { type: 'number', example: 1799 },
          totalCapacity: { type: 'integer', example: 600 }
        }
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ticket_rec_88219' },
          eventId: { type: 'string', example: 'event_techconf_2026' },
          eventTitle: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
          userId: { type: 'string', example: 'usr_attendee_99' },
          attendeeName: { type: 'string', example: 'Kunal Sharma' },
          attendeeEmail: { type: 'string', example: 'kunal@gmail.com' },
          quantity: { type: 'integer', example: 2 },
          totalPaid: { type: 'number', example: 2998 },
          bookingRef: { type: 'string', example: 'TKT-2026-88219' },
          status: { type: 'string', enum: ['confirmed', 'cancelled'], example: 'confirmed' },
          bookedAt: { type: 'string', format: 'date-time', example: '2026-03-02T16:20:00.000Z' }
        }
      },
      TicketBookingRequest: {
        type: 'object',
        required: ['eventId', 'quantity', 'attendeeName', 'attendeeEmail'],
        properties: {
          eventId: { type: 'string', example: 'event_techconf_2026' },
          quantity: { type: 'integer', minimum: 1, maximum: 10, example: 2 },
          attendeeName: { type: 'string', example: 'Kunal Sharma' },
          attendeeEmail: { type: 'string', format: 'email', example: 'kunal@gmail.com' }
        }
      }
    }
  },
  tags: [
    {
      name: 'Auth',
      description: 'Public registration, login credential verification, and user profile inspection'
    },
    {
      name: 'Events',
      description: 'Public event discovery and Organizer-managed event lifecycles'
    },
    {
      name: 'Tickets',
      description: 'Atomic ticket booking with ACID concurrency guarantees, cancellation, and attendee auditing'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

// Custom UI Styling: Clean, premium slate/indigo aesthetic replacing default Swagger green bar
const customSwaggerOptions = {
  customSiteTitle: 'Event Management & Ticketing API — Documentation',
  customCss: `
    :root {
      --primary-color: #4f46e5;
      --primary-dark: #3730a3;
      --bg-dark: #0f172a;
      --surface-dark: #1e293b;
      --text-light: #f8fafc;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-amber: #f59e0b;
    }
    .swagger-ui .topbar {
      background-color: var(--bg-dark) !important;
      border-bottom: 2px solid #334155;
      padding: 12px 0;
    }
    .swagger-ui .topbar-wrapper img {
      content: url('https://img.icons8.com/isometric/50/ticket.png');
      height: 38px;
    }
    .swagger-ui .topbar-wrapper .link span::after {
      content: '  Ticketing API Console';
      font-weight: 700;
      color: #e2e8f0;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .swagger-ui .info {
      margin: 30px 0 20px 0;
    }
    .swagger-ui .info .title {
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      font-weight: 800;
      font-size: 2.2rem;
      letter-spacing: -0.03em;
    }
    .swagger-ui .btn.authorize {
      background-color: var(--primary-color) !important;
      color: #ffffff !important;
      border-color: var(--primary-color) !important;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
      transition: all 0.2s ease;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: var(--primary-dark) !important;
    }
    .swagger-ui .btn.authorize svg {
      fill: #ffffff !important;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.04);
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #6366f1;
      border-radius: 6px;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #0ea5e9;
      background: rgba(14, 165, 233, 0.04);
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #0ea5e9;
      border-radius: 6px;
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.04);
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #f59e0b;
      border-radius: 6px;
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.04);
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #ef4444;
      border-radius: 6px;
    }
    .swagger-ui .opblock {
      border-radius: 10px;
      margin-bottom: 14px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }
    .swagger-ui .opblock-summary {
      padding: 10px 16px;
    }
  `
};

module.exports = { swaggerSpec, customSwaggerOptions };
