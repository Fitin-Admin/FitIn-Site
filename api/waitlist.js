// Vercel Serverless Function — stores iOS waitlist emails in Upstash Redis.
// Drop this file at /api/waitlist.js in your Vercel project. No extra
// framework needed — Vercel auto-detects anything under /api as a function.
//
// SETUP (one time, ~2 minutes):
// 1. Vercel dashboard -> Storage -> Marketplace Database Providers -> Upstash -> Create.
//    Connect it to the "fitin-site" project. This injects env vars
//    (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) automatically.
// 2. Run: npm install @upstash/redis
// 3. Deploy. Upstash's free tier is more than enough for waitlist signups.

import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

export const config = {
  runtime: 'edge',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const source = body.source || 'ios-waitlist';

    if (!EMAIL_PATTERN.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // De-dupe: use the email itself as the key, store signup metadata as the value.
    const key = `waitlist:${email}`;
    const alreadyExists = await kv.get(key);

    if (!alreadyExists) {
      await kv.set(key, {
        email,
        source,
        joinedAt: new Date().toISOString(),
      });

      // Maintain a running count for easy tracking.
      await kv.incr('waitlist:count');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
