# Mastery Key Coach — Authentic Account & Data Recovery Guide

**Target Identity:** `mohith_mk_21` (`mohith.kuberan2006@gmail.com`)  
**Source Database:** [`backend/app/app.db`](file:///C:/Projects/AI-Goal-Coach/backend/app/app.db) (1.94 MB SQLite)  
**Destination Database:** Supabase PostgreSQL (`mastery-key-coach`)  
**Status:** **Awaiting Explicit User Authorization**

---

## 1. Forensics Summary (From Authentic SQLite Backup)

A full forensic extraction from the genuine original SQLite database ([`backend/app/app.db`](file:///C:/Projects/AI-Goal-Coach/backend/app/app.db)) verified the exact authentic data:

- **User Profile:**
  - **Username:** `mohith_mk_21`
  - **Email:** `mohith.kuberan2006@gmail.com`
  - **Full Name:** `MOHITH K`
  - **MKC ID:** `MKC-2026-9EE97E`
  - **Avatar Initials:** `MK`
  - **Bio:** `AI Engineering & Full-Stack Systems Mastery`
  - **Onboarding Completed:** `1`
  - **Created At:** `2026-08-10 17:25:58`
- **Genuine Goal (1 record):**
  - **Title:** `AI Systems Mastery`
  - **Description:** *Build autonomous agentic platforms and modern AI applications.*
  - **Category:** `learning`, **Status:** `active`, **Target Date:** `2026-12-31`
- **Genuine Daily Missions (2 records):**
  - **Mission 1:** `Morning Protocol & System Architecture Block` (30 min, easy, 15 XP)
  - **Mission 2:** `Complete Morning Deep Work Protocol` (15 min, easy, 15 XP)
- **Genuine User Settings:**
  - Theme: `dark`, Coach style: `strategic`, Daily reminder: `08:00`, Profile visibility: `public`

---

## 2. Safe, Non-Destructive SQL Script

This script preserves all genuine relationships, uses non-destructive upserts (`ON CONFLICT`), leaves other accounts untouched, and leaves password assignment to the secure password reset flow:

```sql
-- ============================================================================
-- MASTERY KEY COACH — AUTHENTIC DATA RESTORATION (User: mohith_mk_21)
-- ============================================================================

-- 1. Insert or update genuine user record
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
    'admin', -- Requires explicit user approval
    1,
    1,
    '{"primary_goal": "AI Engineering & System Architecture", "commitment_level": "3-5 daily protocols (Standard Mastery)", "improvement_area": "Consistency & Execution", "first_mission_title": "Complete Morning Deep Work Protocol"}',
    '2026-08-10 17:25:58'
)
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    mkc_id = EXCLUDED.mkc_id,
    avatar_initials = EXCLUDED.avatar_initials,
    bio = EXCLUDED.bio,
    role = EXCLUDED.role,
    onboarding_completed = EXCLUDED.onboarding_completed,
    onboarding_data = EXCLUDED.onboarding_data;

-- 2. Restore genuine user settings
INSERT INTO user_settings (user_id, theme, notifications_enabled, coach_style, daily_reminder_time, profile_visibility)
SELECT id, 'dark', 1, 'strategic', '08:00', 'public'
FROM users WHERE username = 'mohith_mk_21'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Restore genuine goal: AI Systems Mastery
INSERT INTO goals (user_id, title, description, category, status, target_date)
SELECT id, 'AI Systems Mastery', 'Build autonomous agentic platforms and modern AI applications.', 'learning', 'active', '2026-12-31'
FROM users WHERE username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM goals g2 JOIN users u2 ON g2.user_id = u2.id WHERE u2.username = 'mohith_mk_21' AND g2.title = 'AI Systems Mastery'
);

-- 4. Restore genuine daily missions
INSERT INTO missions (user_id, title, description, category, time, difficulty, xp_reward, completed)
SELECT id, 'Morning Protocol & System Architecture Block', 'Execute deep work block and protocol tasks.', 'productivity', '30 min', 'easy', 15, 0
FROM users u WHERE u.username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM missions m2 WHERE m2.user_id = u.id AND m2.title = 'Morning Protocol & System Architecture Block'
);

INSERT INTO missions (user_id, title, description, category, time, difficulty, xp_reward, completed)
SELECT id, 'Complete Morning Deep Work Protocol', 'User-created onboarding protocol task', 'productivity', '15 min', 'easy', 15, 0
FROM users u WHERE u.username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM missions m2 WHERE m2.user_id = u.id AND m2.title = 'Complete Morning Deep Work Protocol'
);

-- 5. Verification Query
SELECT id, email, username, full_name, role, is_active FROM users WHERE username = 'mohith_mk_21';
```

---

## 3. Secure Password Reset Verification Flow

Because the previous password was exposed in a screenshot, the password is not hardcoded into SQL:

1. User requests password reset via `POST /api/auth/forgot-password` with identifier `mohith_mk_21` or `mohith.kuberan2006@gmail.com`.
2. A single-use SHA-256 hashed token with 15-minute expiration is created in `password_resets`.
3. User completes password reset via `POST /api/auth/reset-password` with their new confidential password.
4. All prior sessions are revoked, and the user logs into [Mastery Key Coach](https://mastery-key-coach.netlify.app).
