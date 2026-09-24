/**
 * Concurrency & Rate Limiting Verification Script
 * Demonstrates Firestore runTransaction() atomicity under flash-sale traffic
 * and verifies express-rate-limit 429 responses.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('===========================================================');
  console.log('🚀 Starting Event Ticketing API Concurrency & RBAC Test Suite');
  console.log(`📡 Target API: ${API_BASE}`);
  console.log('===========================================================\n');

  try {
    // 1. Check Server Health
    console.log('1️⃣ Checking API Health...');
    const health = await request('/health');
    console.log(`   Status: ${health.status} ->`, health.data);

    // 2. Register Organizer
    const timestamp = Date.now();
    const organizerEmail = `organizer_${timestamp}@test.com`;
    console.log(`\n2️⃣ Registering Organizer: ${organizerEmail}...`);
    const orgRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Tech Events Lead',
        email: organizerEmail,
        password: 'Password123!',
        role: 'organizer'
      })
    });
    console.log(`   Response (${orgRes.status}):`, orgRes.data.message);
    const orgToken = orgRes.data?.data?.token;

    // 3. Create Event with Capacity = 5
    console.log('\n3️⃣ Creating Limited-Capacity Event (Capacity: 5 tickets)...');
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgToken}` },
      body: JSON.stringify({
        title: `Flash Sale AI Conference ${timestamp}`,
        description: 'High concurrency test event',
        category: 'Technology',
        eventDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        venue: 'BKC Convention Center, Mumbai',
        ticketPrice: 999,
        totalCapacity: 5
      })
    });
    console.log(`   Response (${eventRes.status}):`, eventRes.data.message);
    const eventId = eventRes.data?.data?.id;
    console.log(`   Created Event ID: ${eventId}, Initial Capacity: 5`);

    // 4. Register Attendee
    const attendeeEmail = `attendee_${timestamp}@test.com`;
    console.log(`\n4️⃣ Registering Attendee: ${attendeeEmail}...`);
    const attRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aarav Mehta',
        email: attendeeEmail,
        password: 'Password123!',
        role: 'attendee'
      })
    });
    console.log(`   Response (${attRes.status}):`, attRes.data.message);
    const attToken = attRes.data?.data?.token;

    // 5. Test ACID Concurrency: Fire 8 Simultaneous Single-Ticket Bookings (Capacity is only 5!)
    console.log('\n5️⃣ Firing 8 SIMULTANEOUS Concurrent Booking Requests for 1 ticket each (Capacity: 5)...');
    const bookingPromises = Array.from({ length: 8 }).map((_, i) =>
      request('/tickets/book', {
        method: 'POST',
        headers: { Authorization: `Bearer ${attToken}` },
        body: JSON.stringify({
          eventId,
          quantity: 1,
          attendeeName: `Attendee Bot #${i + 1}`,
          attendeeEmail: `bot${i + 1}@test.com`
        })
      })
    );

    const results = await Promise.all(bookingPromises);
    const successful = results.filter(r => r.status === 201);
    const failed = results.filter(r => r.status === 400);
    const rateLimited = results.filter(r => r.status === 429);

    console.log(`   ✅ Succeeded Bookings (Expected 5): ${successful.length}`);
    console.log(`   ❌ Rejected Due to Sold Out (Expected 3): ${failed.length}`);
    console.log(`   ⚠️ Rate Limited (429): ${rateLimited.length}`);

    // 6. Verify Event Remaining Count in Database
    console.log('\n6️⃣ Verifying Final Event Live Capacity...');
    const verifyEvent = await request(`/events/${eventId}`);
    console.log(`   Remaining Available Tickets: ${verifyEvent.data?.data?.availableTickets} (Must be >= 0, exactly 0 if 5 were sold)`);

    if (verifyEvent.data?.data?.availableTickets === 0 && successful.length === 5) {
      console.log('   🎉 CONCURRENCY TEST PASSED: Zero tickets oversold!');
    }

    // 7. Verify Rate Limiter by Rapidly Firing 12 Requests
    console.log('\n7️⃣ Testing Anti-Scalper Rate Limiter (Firing 12 rapid booking requests)...');
    const rateTestPromises = Array.from({ length: 12 }).map((_, i) =>
      request('/tickets/book', {
        method: 'POST',
        headers: { Authorization: `Bearer ${attToken}` },
        body: JSON.stringify({
          eventId,
          quantity: 1,
          attendeeName: `Scalper Bot #${i + 1}`,
          attendeeEmail: `scalper${i + 1}@test.com`
        })
      })
    );
    const rateResults = await Promise.all(rateTestPromises);
    const rate429Count = rateResults.filter(r => r.status === 429).length;
    console.log(`   Rate Limiter Triggered 429 Responses: ${rate429Count} times.`);
    if (rate429Count > 0) {
      console.log('   🛡️ RATE LIMITING TEST PASSED: Bot spam successfully throttled!');
    }

    console.log('\n===========================================================');
    console.log('✅ All Automated Verification Scenarios Completed');
    console.log('===========================================================');
  } catch (error) {
    console.error('Test Suite Error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification };
