# bills-tracker

This branch (`ai-copilot`) is dedicated to developing a more advanced, AI-agent-first approach to enhancing the existing `bills-tracker` application. We aim to extend its functionality and usability, starting with the following overarching app specifications:

### App Overview
The goal is to build a personal finance web app using modern and scalable tools, focusing on enabling users to manage recurring bills, budget impact, and timelines efficiently.

### Platform and Stack
- **Frontend:** Next.js
- **Backend:** FastAPI
- **Database:** PostgreSQL
- Authentication: Google OAuth or email/password

### Key Features
1. **CSV Upload and Download:**
   - Upload/download CSVs for accounts, debts, recurring bills, and transactions.
   - Support column mapping, preview, validation, and export.

2. **Drag-and-Drop Payment List:**
   - Real-time updates to projected cash flow and budgets.
   
3. **What-If Scenarios:**
   - Changing payment orders or dates updates forecasts instantly.

### Planned Infrastructure
The deployment infrastructure will include AWS, provisioned through Terraform with a free-tier-aware design. The app’s architecture will be highly modular to support future integrations (e.g., Plaid).

### Branching & Next Steps
We will experiment with multiple AI-agent approaches to solve challenges and build new features in this application. 

> **Note to Collaborators / Future Developers:** Restrict all work to `ai-copilot` unless explicitly directed otherwise. Additional branches will be created off this branch for independent experimentation.