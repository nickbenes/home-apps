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
import { runBriefing, getLatestBriefing } from './briefing.js';
import { getAllCcirs, addCcir, archiveCcir, ActiveListItemNotFoundError as CcirNotFoundError } from './ccirs.js';
import {
  getAllStandingOrders,
  addStandingOrder,
  archiveStandingOrder,
  ActiveListItemNotFoundError as StandingOrderNotFoundError,
} from './standing-orders.js';

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

  router.get('/briefing/latest', (_req, res) => {
    res.json(getLatestBriefing());
  });

  router.post('/briefing/run', async (_req, res) => {
    try {
      const result = await runBriefing();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Briefing run failed' });
    }
  });

  router.get('/ccirs', (_req, res) => {
    res.json(getAllCcirs());
  });

  router.post('/ccirs', (req, res) => {
    const { text, agent, review } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    res.json(addCcir({ text, agent, review }));
  });

  router.post('/ccirs/:id/archive', (req, res) => {
    const { note } = req.body;
    try {
      res.json(archiveCcir(req.params.id, note));
    } catch (err) {
      if (err instanceof CcirNotFoundError) return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err instanceof Error ? err.message : 'Archive failed' });
    }
  });

  router.get('/standing-orders', (_req, res) => {
    res.json(getAllStandingOrders());
  });

  router.post('/standing-orders', (req, res) => {
    const { text, agent, effective } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    res.json(addStandingOrder({ text, agent, effective }));
  });

  router.post('/standing-orders/:id/archive', (req, res) => {
    const { note } = req.body;
    try {
      res.json(archiveStandingOrder(req.params.id, note));
    } catch (err) {
      if (err instanceof StandingOrderNotFoundError) return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err instanceof Error ? err.message : 'Archive failed' });
    }
  });

  return router;
}
