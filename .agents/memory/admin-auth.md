---
name: Admin auth flow
description: How admin panel authentication works (server-side PIN verification)
---

Admin panel uses a PIN ("2434") verified **server-side**, not client-side.

**Flow:**
1. Frontend (`admin.tsx`) sends `POST /api/admin/verify` with `{ password }` via fetch with `credentials: "include"`
2. Server checks PIN, sets `req.session.adminUnlocked = true` and saves session
3. All admin data routes protected by `requireAdmin` middleware checking `req.session.adminUnlocked`
4. Session type in `session-types.ts` includes `adminUnlocked: boolean`

**Why:** Original code only checked PIN on the frontend, leaving all admin API endpoints completely unprotected.
