import { Router } from 'express';
import {
  getOpenIssues,
  getActiveReminders,
  getInboxBacklogCount,
  getRecentResearch,
  getLatestNewsletterDigest,
  getLatestEmailDigest,
  getLatestSessionLog,
} from './vault.js';
import { getOpenTodos } from './todos-client.js';
import { getAllIssues, reorderOpenIssues, updateIssue, resolveIssue, IssueNotFoundError } from './issues.js';

export function createRouter() {
  const router = Router();

  router.get('/tiles', async (_req, res) => {
    const [openTodos] = await Promise.all([getOpenTodos()]);

    res.json({
      issuesBacklog: {
        count: getOpenIssues().length,
        items: getOpenIssues(),
      },
      reminders: {
        count: getActiveReminders().length,
        items: getActiveReminders(),
      },
      todos: {
        count: openTodos.length,
        items: openTodos,
      },
      inbox: {
        backlogCount: getInboxBacklogCount(),
      },
      research: {
        recent: getRecentResearch(5),
      },
      newsletterDigest: {
        latest: getLatestNewsletterDigest(),
      },
      emailTriage: {
        latest: getLatestEmailDigest(),
      },
      xo: {
        latestSessionLog: getLatestSessionLog(),
      },
    });
  });

  router.get('/issues', (_req, res) => {
    res.json(getAllIssues());
  });

  router.put('/issues/reorder', (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== 'string')) {
      return res.status(400).json({ error: 'orderedIds must be an array of strings' });
    }
    try {
      const issues = reorderOpenIssues(orderedIds);
      res.json(issues);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Reorder failed' });
    }
  });

  router.patch('/issues/:id', (req, res) => {
    const { priority, status } = req.body;
    if (priority === undefined && status === undefined) {
      return res.status(400).json({ error: 'priority or status is required' });
    }
    if (priority !== undefined && !['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({ error: 'priority must be high, medium, or low' });
    }
    if (status !== undefined && !['open', 'discussing', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'status must be open, discussing, or resolved' });
    }
    try {
      const issue = updateIssue(req.params.id, { priority, status });
      res.json(issue);
    } catch (err) {
      if (err instanceof IssueNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
    }
  });

  router.post('/issues/:id/resolve', (req, res) => {
    const { note } = req.body;
    if (typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'note is required' });
    }
    try {
      const issue = resolveIssue(req.params.id, note);
      res.json(issue);
    } catch (err) {
      if (err instanceof IssueNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'Resolve failed' });
    }
  });

  return router;
}
