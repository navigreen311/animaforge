# Staging: smallest shapes that still exercise the same code paths as
# production. Multi-AZ and read replicas are off because staging outages are
# not incidents — but backups stay on, because losing staging data still costs
# someone an afternoon of reseeding.

environment = "staging"
region      = "us-east-1"

availability_zone_count = 2

# Kubernetes
kubernetes_version     = "1.30"
app_node_instance_type = "t3.large"
app_node_min_size      = 2
app_node_max_size      = 4
gpu_node_enabled       = false

# PostgreSQL
postgres_instance_class        = "db.t4g.medium"
postgres_allocated_storage     = 50
postgres_max_allocated_storage = 200
postgres_multi_az              = false
postgres_read_replica_count    = 0
postgres_backup_retention_days = 3

# Redis
redis_node_type     = "cache.t4g.small"
redis_replica_count = 1

# Storage and CDN
cdn_price_class       = "PriceClass_100"
output_retention_days = 7

cors_allowed_origins = ["https://staging.animaforge.com"]

tags = {
  CostCenter = "engineering"
}
