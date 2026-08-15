# Production: the "Recommended" column of the infrastructure table in
# docs/deployment.md.
#
# gpu_node_enabled stays false here deliberately. GPU capacity is the single
# largest line item in this stack, and turning it on should be an explicit
# decision with a capacity plan behind it — not something that happens because
# someone ran apply with the production tfvars.

environment = "production"
region      = "us-east-1"

availability_zone_count = 3

# Kubernetes
kubernetes_version     = "1.30"
app_node_instance_type = "m5.2xlarge" # 8 vCPU / 32GB
app_node_min_size      = 4
app_node_max_size      = 12
gpu_node_enabled       = false
gpu_node_instance_type = "g5.2xlarge"
gpu_node_min_size      = 0
gpu_node_max_size      = 8

# PostgreSQL — db.r6g.2xlarge + 2 read replicas
postgres_instance_class        = "db.r6g.2xlarge"
postgres_allocated_storage     = 500
postgres_max_allocated_storage = 4000
postgres_multi_az              = true
postgres_read_replica_count    = 2
postgres_backup_retention_days = 30

# Redis — 3-node cluster (primary + 2 replicas)
redis_node_type     = "cache.r6g.xlarge"
redis_replica_count = 2

# Storage and CDN
cdn_price_class       = "PriceClass_200"
output_retention_days = 30

cors_allowed_origins = ["https://animaforge.com", "https://app.animaforge.com"]

# Set both together once the certificate exists in us-east-1.
# cdn_aliases         = ["cdn.animaforge.com"]
# acm_certificate_arn = "arn:aws:acm:us-east-1:...:certificate/..."

tags = {
  CostCenter = "production"
  Compliance = "c2pa"
}
