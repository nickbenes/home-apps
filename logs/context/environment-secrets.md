# Using Environment Secrets

## Overview
This project uses **repository-level secrets** to store sensitive information such as AWS credentials, database passwords, or API keys.

## Current Secrets
| **Secret Name**          | **Purpose**             |
|--------------------------|-------------------------|
| `AWS_ACCESS_KEY_ID`     | AWS authentication key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key         |
| `DB_PASSWORD`           | PostgreSQL password    |

## Instructions to Add Secrets
1. Go to your repository [Settings → Secrets → Actions](https://github.com/nickbenes/bills-tracker/settings/secrets/actions).
2. Add the required secret names.

## Accessing Secrets
### Codespaces:
Secrets will automatically be available in Codespaces environments as environment variables.

### GitHub Actions:
Use secrets in workflows like this:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: AWS CLI Setup
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```
Refer to the official [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets) for additional details.
