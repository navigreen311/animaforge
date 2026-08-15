# AnimaForge infrastructure

Terraform for the AWS estate the application actually needs: the EKS cluster the
`k8s/` manifests are written against, PostgreSQL 16 with pgvector, Redis, object
storage, and the CDN in front of it.

## Why AWS

The repo already assumed it. `docs/deployment.md` sizes the estate in
`db.r6g.xlarge`, `cache.r6g.large`, `m5.large` and `r5.large`, names AWS Secrets
Manager, and defaults `S3_REGION` to `us-east-1`. Cloudflare R2 is listed as an
alternative for object storage in the README, but nothing else in the repo is
written against it.

Every default here is taken from the "Infrastructure Requirements" table in
`docs/deployment.md` rather than invented.

## Layout

```
infra/terraform/
├── main.tf                  composes the modules
├── variables.tf             inputs, with the docs reference for each default
├── outputs.tf               endpoints and secret ARNs
├── versions.tf              provider constraints, partial S3 backend
├── environments/
│   ├── staging.tfvars
│   └── production.tfvars
└── modules/
    ├── network/             VPC, 3 subnet tiers, NAT, flow logs
    ├── database/            RDS PostgreSQL 16, replicas, Secrets Manager
    ├── cache/               ElastiCache Redis, failover, auth token
    ├── storage/             S3 assets + outputs, CloudFront
    └── kubernetes/          EKS, node groups, IRSA, addons
```

## Usage

```bash
cd infra/terraform

terraform init \
  -backend-config="bucket=animaforge-tfstate" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=animaforge-tflock"

terraform plan  -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars

# then point kubectl at the cluster and apply k8s/
$(terraform output -raw kubeconfig_command)
kubectl apply -f ../../k8s/
```

The backend block is deliberately partial so `terraform init -backend=false`
works with no credentials at all — that is how CI validates.

## Design notes

**Three subnet tiers.** Public for load balancers, private for EKS nodes,
isolated for RDS and ElastiCache. The isolated tier has _no_ NAT route: the
database cannot reach the internet even if something on it is compromised.

**One NAT gateway per AZ.** A single shared NAT is cheaper but makes that one AZ
a hard dependency for egress from every other.

**Redis uses `volatile-lru`, not `allkeys-lru`.** BullMQ keeps queue state in
Redis. Under an `allkeys` policy, memory pressure evicts job keys and silently
drops in-flight generations. Only keys with an explicit TTL — the cache entries
— may be evicted.

**The outputs bucket is not public.** It is reachable only through the
CloudFront origin access control. Every output carries C2PA provenance and a
watermark; a direct S3 URL would let someone bypass the CDN's controls entirely.

**GPU nodes are tainted.** Without `nvidia.com/gpu:NoSchedule`, ordinary pods
land on GPU nodes and keep them from ever scaling back to zero.

**Secrets are not Terraform outputs.** The Postgres and Redis connection strings
go to Secrets Manager; only the secret ARNs are output. Outputs land in state
files and CI logs.

**`desired_size` is ignored on node groups.** The cluster autoscaler owns it
once running; Terraform would otherwise reset it to the baseline on every apply.

## Verification

CI runs `fmt -check`, `init -backend=false`, `validate` on the root, and then
`validate` on **each module in isolation** — the root passing does not prove a
module is self-contained, since one missing its own `required_providers` still
validates there and breaks for anyone reusing it alone.

```bash
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform init -backend=false
terraform -chdir=infra/terraform validate
```

## What this has and has not been through

**Validated, not applied.** `terraform validate` and `fmt` pass on the root and
on all five modules, and every resource, argument and provider version is real.
But nothing here has been `apply`-ed against an AWS account — there is no
account attached to this repo. Expect the first real apply to surface quota
limits, IAM boundary conditions, and service-linked roles that need creating,
none of which validation can catch.

Treat the first `terraform plan` against a real account as the actual review.

## Not covered

Deliberately out of scope, so nothing here implies they exist:

- **Kafka.** `packages/events` targets a broker, and `docker-compose` runs one
  for local dev, but no MSK cluster is provisioned. `docs/deployment.md` sizes
  it at 3 brokers; that is a separate module.
- **Elasticsearch.** Same: sized in the docs, used by `services/search`, not
  provisioned here.
- **DNS and certificates.** No Route 53 zone, no ACM issuance. `cdn_aliases`
  accepts a certificate ARN but does not create one.
- **The state backend itself.** The S3 bucket and DynamoDB lock table have to
  exist before the first `init`; bootstrapping them from the same config would
  be circular.
- **ArgoCD.** The README describes deployment via ArgoCD. Nothing installs it.
- **Monitoring stack.** `k8s/monitoring/` has Prometheus and Grafana manifests;
  no managed equivalents are provisioned.
