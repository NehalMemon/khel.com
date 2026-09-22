---
trigger: always_on
---

# Platform Roles & Authorization Boundaries

## 1. Platform Admin (`role = 'admin'`)
- **Access:** Global read/write access across the entire platform.
- **RLS Rule:** Bypass all tenant isolation constraints. Can manage any table.

## 2. Venue Owner (`role = 'venue_owner'`)
- **Access:** B2B tenant isolation.
- **RLS Rule:** Can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` records (venues, courts, slots) where the root `venue.owner_id` matches their `auth.uid()`.
- **UI Boundary:** Operates exclusively within the Partner Portal dashboards.

## 3. Customer (`role = 'customer'`)
- **Access:** Public marketplace consumer.
- **RLS Rule:** Can `SELECT` all active venues, courts, and available slots. Can only view or mutate `bookings` where `customer_id` matches their `auth.uid()`.
- **UI Boundary:** Operates on the main customer-facing marketplace.

