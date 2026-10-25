# Mastery Key Coach — Authentic Account Recovery Guide (Option 3 Plan)

**Target Identity:** `mohith_mk_21` (`mohith.kuberan2006@gmail.com`)  
**Initial Role:** `user` (Exact fidelity with SQLite; admin elevation separate)  
**Status:** **AWAITING EMAIL PROVIDER SETUP & EXPLICIT EXECUTION APPROVAL**

---

## 1. Step 1: Configure Email Provider in Netlify

To enable automated password reset emails:
1. Open [Netlify Dashboard](https://app.netlify.com).
2. Select your site: **`mastery-key-coach`**.
3. Navigate to: **Site configuration** &rarr; **Environment variables**.
4. Add your preferred provider variable:
   - **Resend (Recommended):** `RESEND_API_KEY` = `re_...` (optional: `RESEND_FROM_EMAIL = onboarding@resend.dev`)
   - **SendGrid:** `SENDGRID_API_KEY` = `SG....`
   - **Brevo:** `BREVO_API_KEY` = `xkeysib-...`
5. Select scopes: **All scopes** (Builds & Functions).

### Verification:
Check: `https://mastery-key-coach.netlify.app/api/health/email`  
When configured, it returns: `{"configured": true, "provider": "..."}`.

---

## 2. Step 2: ACID Transactional Migration Script (Awaiting Approval)

```sql
BEGIN;

-- 1. PRE-CHECK FOR CONFLICTS (Zero Overwriting Guarantee)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = 'mohith.kuberan2006@gmail.com') THEN
        RAISE EXCEPTION 'PRE-CHECK CONFLICT: An account with email mohith.kuberan2006@gmail.com already exists in Supabase. Migration aborted.';
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'mohith_mk_21') THEN
        RAISE EXCEPTION 'PRE-CHECK CONFLICT: An account with username mohith_mk_21 already exists in Supabase. Migration aborted.';
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE mkc_id = 'MKC-2026-9EE97E') THEN
        RAISE EXCEPTION 'PRE-CHECK CONFLICT: An account with MKC ID MKC-2026-9EE97E already exists in Supabase. Migration aborted.';
    END IF;
END $$;

-- 2. INSERT AUTHENTIC USER RECORD
INSERT INTO users (
    email,
    username,
    full_name,
    mkc_id,
    avatar_initials,
    bio,
    role,
    email_verified,
    onboarding_completed,
    onboarding_data,
    created_at
) VALUES (
    'mohith.kuberan2006@gmail.com',
    'mohith_mk_21',
    'MOHITH K',
    'MKC-2026-9EE97E',
    'MK',
    'AI Engineering & Full-Stack Systems Mastery',
    'user', -- Preserved as 'user' per original SQLite database
    0,      -- Preserved as 0 until ownership verification succeeds
    1,
    '{"primary_goal": "AI Engineering & System Architecture", "commitment_level": "3-5 daily protocols (Standard Mastery)", "improvement_area": "Consistency & Execution", "first_mission_title": "Complete Morning Deep Work Protocol"}',
    '2026-08-10 17:25:58'
);

-- 3. INSERT AUTHENTIC USER SETTINGS
INSERT INTO user_settings (user_id, theme, notifications_enabled, coach_style, daily_reminder_time, profile_visibility, created_at, updated_at)
SELECT id, 'dark', 1, 'strategic', '08:00', 'public', '2026-08-10 17:25:58', '2026-08-10 17:25:58'
FROM users WHERE username = 'mohith_mk_21';

-- 4. INSERT AUTHENTIC GOAL: AI Systems Mastery
INSERT INTO goals (user_id, title, description, category, status, target_date, created_at)
SELECT id, 'AI Systems Mastery', 'Build autonomous agentic platforms and modern AI applications.', 'learning', 'active', '2026-12-31', '2026-08-10 17:25:58'
FROM users WHERE username = 'mohith_mk_21';

-- 5. INSERT AUTHENTIC DAILY MISSIONS (Linked to Goal & User)
INSERT INTO missions (user_id, goal_id, title, description, category, time, difficulty, xp_reward, completed, created_at)
SELECT u.id, g.id, 'Morning Protocol & System Architecture Block', 'Execute deep work block and protocol tasks.', 'productivity', '30 min', 'easy', 15, 0, '2026-08-12 06:13:31'
FROM users u
JOIN goals g ON g.user_id = u.id AND g.title = 'AI Systems Mastery'
WHERE u.username = 'mohith_mk_21';

INSERT INTO missions (user_id, goal_id, title, description, category, time, difficulty, xp_reward, completed, created_at)
SELECT u.id, NULL, 'Complete Morning Deep Work Protocol', 'User-created onboarding protocol task', 'productivity', '15 min', 'easy', 15, 0, '2026-08-12 06:13:31'
FROM users u
WHERE u.username = 'mohith_mk_21';

-- 6. POST-CHECK INTEGRITY VALIDATION
DO $$
DECLARE
    u_count INT;
    s_count INT;
    g_count INT;
    m_count INT;
BEGIN
    SELECT COUNT(*) INTO u_count FROM users WHERE username = 'mohith_mk_21';
    SELECT COUNT(*) INTO s_count FROM user_settings WHERE user_id = (SELECT id FROM users WHERE username = 'mohith_mk_21');
    SELECT COUNT(*) INTO g_count FROM goals WHERE user_id = (SELECT id FROM users WHERE username = 'mohith_mk_21');
    SELECT COUNT(*) INTO m_count FROM missions WHERE user_id = (SELECT id FROM users WHERE username = 'mohith_mk_21');

    IF u_count != 1 OR s_count != 1 OR g_count != 1 OR m_count != 2 THEN
        RAISE EXCEPTION 'POST-CHECK INTEGRITY FAILURE: Expected 1 user, 1 settings, 1 goal, 2 missions. Rolling back.';
    END IF;
END $$;

COMMIT;
```

---

## 3. Step 3: Password Reset & Ownership Verification

1. Once the user account is created, request password reset via `POST /api/auth/forgot-password` with identifier `mohith_mk_21`.
2. Netlify Functions dispatches a reset email with a single-use token (expires in 15 min) to `mohith.kuberan2006@gmail.com`.
3. You click the link, set your confidential password on `/reset-password`.
4. Successful reset verifies ownership of the registered email address.

---

## 4. Step 4: Administrator Elevation (Separate Authorized Step)

Once ownership is proven and logged in:
Execute separate administrative role elevation query:
```sql
UPDATE users SET role = 'admin', email_verified = 1 WHERE username = 'mohith_mk_21';
```
And verify access to `GET /api/admin/overview`.
