# AnimaForge Disaster Recovery Runbook

## Overview

This document outlines the procedures for recovering AnimaForge services in the event of a critical failure. The goal is to restore full operation within the defined RTO (Recovery Time Objective) of 1 hour and RPO (Recovery Point Objective) of 15 minutes.

## Prerequisites

- AWS CLI configured with appropriate IAM credentials
- Access to the `animaforge-backups` S3 bucket
- PostgreSQL client tools (`psql`, `pg_restore`) installed
- Access to the production Kubernetes cluster or deployment environment
- Environment variables: `DATABASE_URL`, `BACKUP_S3_BUCKET`

## Database Restoration

1. **Identify the latest backup**
   ```bash
   aws s3 ls s3://animaforge-backups/postgres/ --recursive | sort | tail -5
   ```

2. **Download the backup**
   ```bash
   aws s3 cp s3://animaforge-backups/postgres/animaforge-db-YYYYMMDD_HHMMSS.sql.gz /tmp/restore.sql.gz
   ```

3. **Restore to the target database**
   ```bash
   gunzip -c /tmp/restore.sql.gz | psql "$DATABASE_URL"
   ```

4. **Verify restoration**
   ```bash
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM projects;"
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
   ```

## S3 Asset Recovery

If the primary asset bucket is compromised or data is lost:

1. Enable S3 versioning recovery to restore deleted objects:
   ```bash
   aws s3api list-object-versions --bucket animaforge-assets --prefix uploads/
   ```
2. Restore from the cross-region replica bucket if the primary is unavailable:
   ```bash
   aws s3 sync s3://animaforge-assets-replica/ s3://animaforge-assets/
   ```

## Verification

After restoration, verify the following:

- [ ] Database connectivity from all services
- [ ] User authentication and session validity
- [ ] Project listing and shot data integrity
- [ ] Asset URLs resolve and files are accessible
- [ ] Video generation jobs can be queued and processed
- [ ] Webhook deliveries are functioning
- [ ] Health endpoint returns 200 OK (`GET /api/v1/health`)

## User Communication Template

> **Subject:** AnimaForge Service Recovery Complete
>
> We experienced a service disruption on [DATE] from [START TIME] to [END TIME] UTC.
>
> **Impact:** [Brief description of what was affected]
>
> **Root cause:** [Brief technical explanation]
>
> **Resolution:** All services have been fully restored. No user data was lost.
>
> **Preventive measures:** [What we are doing to prevent recurrence]
>
> If you notice any issues, please contact support@animaforge.com.

## Contact

- **On-call engineer:** Check PagerDuty rotation
- **Infrastructure lead:** ops@animaforge.com
- **Status page:** https://status.animaforge.com
