# Mastery Key Coach — Admin Account Restoration Guide

**Target Account:** `mohith_mk_21` (`mohith.kuberan2006@gmail.com`)  
**Target Database:** Supabase Free PostgreSQL (`mastery-key-coach`)  
**Assigned Role:** `admin`  
**Password:** Configured to match the credentials displayed in your screenshot (`mk2109mk9669`).

---

## 1-Click Restoration in Supabase SQL Editor

To instantly restore your authentic account, link your administrator permissions, and recover your original goals and missions:

1. Open your **Supabase Dashboard** at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your project: **`mastery-key-coach`**.
3. In the left navigation, click **SQL Editor**.
4. Click **New query** (or the **+** button).
5. Copy and paste the complete script below, then click **RUN**:

```sql
-- ============================================================================
-- MASTERY KEY COACH — RESTORE AUTHENTIC ADMIN ACCOUNT & DATA
-- ============================================================================

-- 1. Insert or update the authentic admin user: mohith_mk_21
INSERT INTO users (
    email,
    username,
    password_hash,
    full_name,
    mkc_id,
    avatar_initials,
    bio,
    role,
    email_verified,
    onboarding_completed,
    onboarding_data
)
VALUES (
    'mohith.kuberan2006@gmail.com',
    'mohith_mk_21',
    'pbkdf2_sha256$100000$a723bc76c72b6f82f0632f6555798e1a$354211a520bdb9e9d52058c542f2c0135f09d28a3dba67ca919ba0c9a09d6da3',
    'MOHITH K',
    'MKC-2026-9EE97E',
    'MK',
    'AI Engineering & Full-Stack Systems Mastery',
    'admin',
    1,
    1,
    '{"primary_goal": "AI Engineering & System Architecture", "commitment_level": "3-5 daily protocols (Standard Mastery)", "improvement_area": "Consistency & Execution", "first_mission_title": "Complete Morning Deep Work Protocol"}'
)
ON CONFLICT (email) DO UPDATE 
SET 
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = 'admin',
    email_verified = 1;

-- 2. Restore User Settings
INSERT INTO user_settings (user_id, theme, notifications_enabled, coach_style, daily_reminder_time, profile_visibility)
SELECT id, 'dark', 1, 'strategic', '08:00', 'public'
FROM users
WHERE username = 'mohith_mk_21'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Restore Core Goal: AI Systems Mastery
INSERT INTO goals (user_id, title, description, category, status, target_date)
SELECT id, 'AI Systems Mastery', 'Build autonomous agentic platforms and modern AI applications.', 'learning', 'active', '2026-12-31'
FROM users
WHERE username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM goals g JOIN users u ON g.user_id = u.id WHERE u.username = 'mohith_mk_21' AND g.title = 'AI Systems Mastery'
);

-- 4. Restore Core Daily Missions
INSERT INTO missions (title, description, category, time, difficulty, xp_reward, completed, user_id)
SELECT 'Morning Protocol & System Architecture Block', 'Execute deep work block and protocol tasks.', 'productivity', '30 min', 'easy', 15, 0, u.id
FROM users u 
WHERE u.username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM missions m WHERE m.user_id = u.id AND m.title = 'Morning Protocol & System Architecture Block'
);

INSERT INTO missions (title, description, category, time, difficulty, xp_reward, completed, user_id)
SELECT 'Complete Morning Deep Work Protocol', 'User-created onboarding protocol task', 'productivity', '15 min', 'easy', 15, 0, u.id
FROM users u 
WHERE u.username = 'mohith_mk_21'
AND NOT EXISTS (
    SELECT 1 FROM missions m WHERE m.user_id = u.id AND m.title = 'Complete Morning Deep Work Protocol'
);

-- 5. Verification Query (confirms role is admin)
SELECT id, email, username, full_name, role, is_active FROM users WHERE username = 'mohith_mk_21';
```
