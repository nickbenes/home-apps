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

  return router;
}
