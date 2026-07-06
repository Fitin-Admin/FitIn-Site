// Vercel Serverless Function (Node.js runtime) — stores iOS waitlist
// emails in Upstash Redis. Runs as a normal Node function, NOT Edge —
// this avoids a bundler conflict that happens when this file and
// middleware.js both try to run on the Edge runtime together.
//
// Confirmed env vars from Project Settings -> Environment Variables:
// KV_REST_API_URL and KV_REST_API_TOKEN (created by the Upstash integration).

import { Redis } from '@upstash/redis';

// Confirmed from Vercel Project Settings -> Environment Variables:
// KV_REST_API_URL and KV_REST_API_TOKEN (created by the Upstash integration).
const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

const kv = new Redis({ url: redisUrl, token: redisToken });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!redisUrl || !redisToken) {
    res.status(500).json({ error: 'Storage not configured' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const email = (body.email || '').trim().toLowerCase();
    const source = body.source || 'ios-waitlist';

    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }

    const key = `waitlist:${email}`;
    const alreadyExists = await kv.get(key);

    if (!alreadyExists) {
      await kv.set(key, {
        email,
        source,
        joinedAt: new Date().toISOString(),
      });
      await kv.incr('waitlist:count');
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
