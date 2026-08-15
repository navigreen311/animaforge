/**
 * ElastiCache Redis.
 *
 * Backs three things with different tolerances: the cache layer (loseable),
 * BullMQ job queues (not loseable — dropping them loses in-flight generations),
 * and Socket.IO presence. The queue is why failover and snapshots are on by
 * default rather than treated as optional for a cache.
 */

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-redis"
  description = "Redis access from inside the VPC only"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis from within the VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis" })
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name_prefix}-redis"
  family = "redis7"

  parameter {
    name = "maxmemory-policy"
    # NOT allkeys-lru. BullMQ keeps queue state in Redis, and evicting a job
    # key under memory pressure silently drops that job. Only keys with an
    # explicit TTL — the cache entries — may be evicted.
    value = "volatile-lru"
  }

  tags = var.tags
}

resource "random_password" "auth_token" {
  length = 64
  # ElastiCache auth tokens permit only a limited punctuation set.
  override_special = "!&#$^<>-"
}

resource "aws_secretsmanager_secret" "auth_token" {
  name                    = "${var.name_prefix}/redis"
  description             = "Auth token for ${var.name_prefix} Redis"
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "auth_token" {
  secret_id = aws_secretsmanager_secret.auth_token.id

  secret_string = jsonencode({
    auth_token = random_password.auth_token.result
    host       = aws_elasticache_replication_group.this.primary_endpoint_address
    port       = 6379
    # rediss:// — TLS is enforced below, so the scheme has to match.
    url = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  })
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "AnimaForge cache, BullMQ queues and presence"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.this.name
  port                 = 6379

  num_cache_clusters = var.replica_count + 1

  # Both required for a replica to be promoted without manual intervention.
  automatic_failover_enabled = var.replica_count > 0
  multi_az_enabled           = var.replica_count > 0

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.this.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result

  # Queue state is worth a nightly snapshot even though a cache is not.
  snapshot_retention_limit = var.snapshot_retention_days
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:05:30-sun:06:30"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis" })

  lifecycle {
    ignore_changes = [auth_token]
  }
}

resource "aws_cloudwatch_log_group" "slow" {
  name              = "/aws/elasticache/${var.name_prefix}/slow"
  retention_in_days = 14
  tags              = var.tags
}
