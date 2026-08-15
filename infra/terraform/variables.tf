variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "animaforge"

  validation {
    # Used in S3 bucket names and RDS identifiers, both of which reject
    # uppercase and underscores.
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project))
    error_message = "project must be 3-21 chars, lowercase alphanumeric or hyphen, starting with a letter."
  }
}

variable "environment" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be one of: staging, production."
  }
}

variable "region" {
  description = "AWS region. Matches the S3_REGION default in docs/deployment.md."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zone_count" {
  description = <<-EOT
    Number of AZs to spread subnets across. RDS multi-AZ and EKS both require
    at least two, so this is floored at 2 rather than defaulted to it.
  EOT
  type        = number
  default     = 3

  validation {
    condition     = var.availability_zone_count >= 2 && var.availability_zone_count <= 6
    error_message = "availability_zone_count must be between 2 and 6."
  }
}

# ---------------------------------------------------------------------------
#  Kubernetes
# ---------------------------------------------------------------------------

variable "kubernetes_version" {
  description = "EKS control plane version."
  type        = string
  default     = "1.30"
}

variable "app_node_instance_type" {
  description = <<-EOT
    Instance type for the general application node group.

    docs/deployment.md specifies 2x 4 vCPU / 8GB minimum and 4x 8 vCPU / 16GB
    recommended. c5.xlarge is 4 vCPU / 8GB; m5.2xlarge is 8 vCPU / 32GB.
  EOT
  type        = string
  default     = "c5.xlarge"
}

variable "app_node_min_size" {
  description = "Minimum app nodes. docs/deployment.md sets the floor at 2."
  type        = number
  default     = 2
}

variable "app_node_max_size" {
  description = "Maximum app nodes the autoscaler may add."
  type        = number
  default     = 6
}

variable "gpu_node_enabled" {
  description = <<-EOT
    Create the GPU node group for the AI inference workloads.

    Defaults to false. GPU instances are expensive enough that creating them
    implicitly on `terraform apply` would be a costly surprise, and the
    inference services degrade to CPU rather than failing outright.
  EOT
  type        = bool
  default     = false
}

variable "gpu_node_instance_type" {
  description = <<-EOT
    GPU instance type. docs/deployment.md asks for A100 40GB minimum; on AWS
    the closest single-tenant option is p4d.24xlarge (8x A100 40GB), so
    g5.2xlarge (1x A10G 24GB) is the default as the cheapest type that can
    actually run the inference containers.
  EOT
  type        = string
  default     = "g5.2xlarge"
}

variable "gpu_node_min_size" {
  description = "Minimum GPU nodes. Zero lets the cluster scale to no GPU cost when idle."
  type        = number
  default     = 0
}

variable "gpu_node_max_size" {
  description = "Maximum GPU nodes."
  type        = number
  default     = 4
}

# ---------------------------------------------------------------------------
#  PostgreSQL
# ---------------------------------------------------------------------------

variable "postgres_version" {
  description = "Engine version. Must be 16.x — packages/db/prisma requires pgvector on PG16."
  type        = string
  default     = "16.4"
}

variable "postgres_instance_class" {
  description = "RDS instance class. docs/deployment.md: db.r6g.xlarge minimum."
  type        = string
  default     = "db.r6g.xlarge"
}

variable "postgres_allocated_storage" {
  description = "Initial storage in GB."
  type        = number
  default     = 100
}

variable "postgres_max_allocated_storage" {
  description = "Ceiling for RDS storage autoscaling in GB."
  type        = number
  default     = 1000
}

variable "postgres_read_replica_count" {
  description = "Read replicas. docs/deployment.md recommends 2 in production."
  type        = number
  default     = 0
}

variable "postgres_multi_az" {
  description = "Run a standby in a second AZ."
  type        = bool
  default     = true
}

variable "postgres_backup_retention_days" {
  description = "Automated backup retention."
  type        = number
  default     = 7

  validation {
    # 0 disables backups entirely, which also disables point-in-time recovery.
    condition     = var.postgres_backup_retention_days >= 1
    error_message = "Backup retention must be at least 1 day; 0 disables PITR."
  }
}

# ---------------------------------------------------------------------------
#  Redis
# ---------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type. docs/deployment.md: cache.r6g.large minimum."
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_replica_count" {
  description = <<-EOT
    Replicas per shard. Automatic failover requires at least one, and BullMQ
    losing its queue state on a node failure means losing in-flight jobs.
  EOT
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis engine version. docker-compose runs redis:7-alpine."
  type        = string
  default     = "7.1"
}

# ---------------------------------------------------------------------------
#  Storage and CDN
# ---------------------------------------------------------------------------

variable "cdn_price_class" {
  description = "CloudFront price class. PriceClass_100 is North America + Europe only."
  type        = string
  default     = "PriceClass_100"
}

variable "output_retention_days" {
  description = <<-EOT
    Days before generated outputs transition to infrequent access. Renders are
    read heavily for a few days after generation and rarely afterwards.
  EOT
  type        = number
  default     = 30
}

variable "tags" {
  description = "Extra tags merged into every resource."
  type        = map(string)
  default     = {}
}

variable "cors_allowed_origins" {
  description = "Origins allowed to upload directly to the assets bucket."
  type        = list(string)
  default     = []
}

variable "cdn_aliases" {
  description = "Custom domains for the CDN. Requires acm_certificate_arn."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate for cdn_aliases. Must be issued in us-east-1."
  type        = string
  default     = null
}
