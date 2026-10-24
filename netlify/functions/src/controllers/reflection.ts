import { Router, Response } from 'express';
import { query } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

router.get('/daily', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().slice(0, 10);
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // 1. Check if user already logged a journal entry for today
    const journalRes = await query('SELECT * FROM journal_entries WHERE user_id = $1 AND entry_date = $2', [
      userId,
      today,
    ]);
    const entry = journalRes.rows[0] || null;

    // 2. Fetch user's active goal
    const goalRes = await query(
      "SELECT title FROM goals WHERE user_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1",
      [userId]
    );
    const activeGoalTitle = goalRes.rows[0]?.title || 'AI Engineering Mastery';

    // 3. Fetch completed missions count for today
    const missionRes = await query(
      `SELECT COUNT(*) as count FROM mission_logs WHERE user_id = $1 AND completed_date = $2`,
      [userId, today]
    );
    const completedMissions = parseInt(missionRes.rows[0]?.count || '0', 10);

    // 4. Default reflection quotes based on user metrics
    const reflections = [
      {
        text: `Focused execution on '${activeGoalTitle}'. You are not just dreaming—you are building your legacy step by step.`,
        category: 'goals',
        highlight_metric: activeGoalTitle,
        highlight_color: '#3B82F6',
      },
      {
        text: 'Discipline is choosing between what you want now and what you want most. Execute your daily protocols with absolute focus.',
        category: 'mindset',
        highlight_metric: 'Daily Protocol',
        highlight_color: '#38BDF8',
      },
      {
        text: 'Small daily choices compound into extraordinary tomorrows. Consistency creates unstoppable momentum.',
        category: 'consistency',
        highlight_metric: 'Compounding Wins',
        highlight_color: '#10B981',
      },
      {
        text: 'Turn friction into fuel. Motivation is an emotional impulse; discipline is an automated engineering system.',
        category: 'discipline',
        highlight_metric: 'Stoic Standard',
        highlight_color: '#FBBF24',
      },
    ];

    if (completedMissions > 0) {
      reflections.unshift({
        text: `You have completed ${completedMissions} mission protocols today. Your daily execution is reinforcing your highest-standard identity.`,
        category: 'missions',
        highlight_metric: `${completedMissions} Done Today`,
        highlight_color: '#38BDF8',
      });
    }

    // Deterministic selection based on day of year and user ID
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const selected = reflections[(dayOfYear + userId) % reflections.length];

    const questions = [
      'What was your primary high-leverage win today?',
      'Where did you experience friction or resistance, and why?',
      'What mental model or insight will you carry forward tomorrow?',
    ];

    return res.json({
      reflection: selected.text,
      date: formattedDate,
      category: selected.category,
      highlight_metric: selected.highlight_metric,
      highlight_color: selected.highlight_color,
      completed: !!entry,
      entry,
      questions,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err?.message || 'Failed to fetch reflection' });
  }
});

export default router;
