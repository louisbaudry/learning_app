# Device Linking End-to-End Test Guide

**Status:** Ready to test (Phase 1 complete)  
**Date:** 2026-09-10

This guide walks through testing the complete device linking flow from admin panel to mobile app authentication.

---

## Prerequisites

✅ **Backend Setup (Complete)**
- Supabase database deployed (`raamrmdjfmzbtaczvfbu`)
- `redeem-link-code` Edge Function deployed and ACTIVE
- All tables created with RLS policies in place

✅ **Admin Panel (Complete)**
- Next.js admin panel running locally
- Supabase Auth working
- Students management page functional
- Device code generation implemented

🚧 **Mobile App (In Progress)**
- Expo scaffolded
- Needs: Device linking UI, code entry screen, auth integration

---

## Test Scenario: Parent Creates Code, Child Redeems It

### Step 1: Admin Panel — Create Family & Student

1. **Start admin panel:**
   ```bash
   npm run dev -w @learning-app/admin
   ```
   Opens http://localhost:3000

2. **Sign up as parent:**
   - Click "Sign Up"
   - Create account with email/password
   - Supabase automatically creates a `families` row + family membership

3. **Add a student:**
   - Go to dashboard
   - Click "Manage Students" on your family
   - Click "+ Add Student"
   - Fill form:
     - First Name: "Arthur" (or test name)
     - Birth Date: any date (optional)
     - Language: "fr" (French)
     - Learner Notes: "Test learner"
   - Click "Create Student"

### Step 2: Admin Panel — Generate Device Link Code

1. **Generate code:**
   - On the student's card, click "🔗 Generate Link Code"
   - A code appears: `WORD-NNNN` (e.g., "TIGRE-7342")
   - Note the expiry time (48 hours)

   **What happens behind the scenes:**
   - Admin panel inserts row into `device_link_codes` table
   - RLS ensures insert is to the parent's family
   - Code is stored in Supabase with `used_at = null`

2. **Save the code:**
   - Copy the generated code (you'll need it in step 3)

### Step 3: Mobile App — Redeem Code (Manual Testing)

Since the mobile app UI is not yet implemented, test the Edge Function directly:

**Option A: Using curl**

```bash
curl -X POST https://raamrmdjfmzbtaczvfbu.supabase.co/functions/v1/redeem-link-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TIGRE-7342",
    "device_name": "Samsung Galaxy A54"
  }'
```

**Expected successful response:**
```json
{
  "success": true,
  "student_id": "uuid-of-arthur",
  "device_id": "uuid-for-this-device",
  "auth_user_id": "uuid-of-anonymous-auth-user"
}
```

**Option B: Using Supabase Studio (HTTP Client)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/raamrmdjfmzbtaczvfbu)
2. Go to "Edge Functions" tab
3. Click "redeem-link-code"
4. Click the "Test" button
5. Add request body:
   ```json
   {
     "code": "TIGRE-7342",
     "device_name": "Test Device"
   }
   ```
6. Click "Send"

### Step 4: Verify State Changes

After successful redemption, verify these tables changed:

**1. Check `device_link_codes` — code marked used:**

Go to Supabase Studio → Database → SQL Editor and run:

```sql
select id, code, used_at from device_link_codes 
where code = 'TIGRE-7342';
```

**Expected result:**
- `used_at` is now a timestamp (not null)

**2. Check `student_devices` — device linked:**

```sql
select id, student_id, device_name, auth_user_id 
from student_devices 
where student_id = 'arthur-uuid';
```

**Expected result:**
- One row with the device name you provided
- `auth_user_id` populated with anonymous user's ID

**3. Check `auth.users` — anonymous user created:**

```sql
select id, email, created_at 
from auth.users 
where id = 'the-auth-user-id-from-step-2';
```

**Expected result:**
- New anonymous user (no email)
- Created just now

---

## Test Cases & Error Scenarios

### Valid Code Redemption ✅

**Input:**
```json
{
  "code": "TIGRE-7342",
  "device_name": "Galaxy A54"
}
```

**Expected:** `{ success: true, student_id, device_id, auth_user_id }`

---

### Invalid Code ❌

**Input:**
```json
{
  "code": "INVALID-9999",
  "device_name": "Device"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid code"
}
```
**HTTP Status:** 401 Unauthorized

---

### Expired Code ❌

**Setup:**
1. Generate a code normally
2. Wait 48+ hours (or manually update in DB: `update device_link_codes set expires_at = now() - interval '1 second' where code = '...'`)

**Input:**
```json
{
  "code": "EXPIRED-CODE",
  "device_name": "Device"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Code has expired"
}
```
**HTTP Status:** 401 Unauthorized

---

### Already Used Code ❌

**Setup:**
1. Generate a code
2. Redeem it once (step 3 above)
3. Try to redeem the same code again

**Input:**
```json
{
  "code": "ALREADY-USED-CODE",
  "device_name": "Another Device"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Code has already been used"
}
```
**HTTP Status:** 401 Unauthorized

---

### Missing Parameters ❌

**Input:**
```json
{
  "code": "TIGRE-7342"
}
```
(Missing `device_name`)

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing code or device_name"
}
```
**HTTP Status:** 400 Bad Request

---

## RLS Verification

After a device is linked, verify RLS isolation:

### Student Device Can Only See Own Data

Once a device is linked via the Edge Function:

1. **Set up device auth** (simulate mobile app):
   ```bash
   # Use the auth_user_id returned from redeem-link-code
   # Mobile SDK would store this and use for future requests
   ```

2. **Verify student sees only own data:**
   ```sql
   -- Run this query as the device's auth user
   select id, student_id from student_devices 
   where auth_user_id = 'the-device-auth-user-id';
   ```
   
   Expected: Returns the linked device row only

3. **Verify student can't see other students:**
   ```sql
   -- This should return nothing (RLS blocks it)
   select id from students where id != 'arthurs-id';
   ```

---

## Next Steps (Mobile App)

Once mobile app implements device linking UI:

1. Create "Enter Link Code" screen
   - Text input for code (formatted as user types)
   - Device name display (system device name or editable)

2. Call `redeem-link-code` Edge Function
   ```typescript
   const response = await fetch(
     `${SUPABASE_URL}/functions/v1/redeem-link-code`,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         code: userInput,
         device_name: DeviceInfo.deviceName
       })
     }
   )
   const { auth_user_id, student_id } = await response.json()
   ```

3. Store credentials
   - Save `auth_user_id` locally
   - Use for all subsequent Supabase requests
   - RLS policies will enforce device isolation

4. Proceed to lesson dashboard
   - Query `assignments` filtered by `student_id`
   - Display assigned lessons

---

## Debugging

### Edge Function Logs

View logs in Supabase Studio or CLI:

```bash
supabase functions logs redeem-link-code --follow
```

### Common Issues

| Problem | Cause | Solution |
|---|---|---|
| "Invalid code" on valid code | Code not found | Check code spelling, verify it was inserted in admin panel |
| "Code has expired" on new code | Expiry time miscalculated | Check server time sync, verify expiry logic in function |
| 500 Internal Server Error | Missing env vars | Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Supabase dashboard |
| Device row not created | RLS policy blocking | Ensure parent's family owns the student |
| Auth user created but device row not | Transaction failed | Check database logs for unique key violations |

---

## Success Criteria

✅ **Device linking is complete when:**

1. Parent generates code in admin panel
2. Code is stored in `device_link_codes` table
3. Code can be redeemed via Edge Function
4. Redemption creates:
   - Anonymous auth user
   - `student_devices` row
   - Marks code as used
5. Returned `auth_user_id` can authenticate to mobile app
6. RLS policies enforce device isolation

---

## References

- `EDGE_FUNCTIONS.md` — Edge Function architecture
- `DATABASE_SCHEMA.md` — RLS policies, device tables
- `SPECIFICATIONS.md` §11 Decision 7 — Device linking security

---

**Created by:** Claude Code (session: 01NzxG9jat3w5FmiE45pLc84)
