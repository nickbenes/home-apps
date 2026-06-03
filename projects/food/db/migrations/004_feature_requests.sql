CREATE TABLE IF NOT EXISTS feature_requests (
  request_id           TEXT    PRIMARY KEY,
  title                TEXT    NOT NULL,
  description          TEXT,
  submitted_by         TEXT,
  status               TEXT    NOT NULL DEFAULT 'open',  -- open | in_progress | done | declined
  github_issue_number  INTEGER,
  github_issue_status  TEXT,     -- open | closed (synced from GitHub API)
  github_issue_url     TEXT,
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
