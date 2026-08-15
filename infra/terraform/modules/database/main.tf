/**
 * PostgreSQL 16 with pgvector.
 *
 * packages/db/prisma/schema.prisma stores embeddings, and docker-compose runs
 * pgvector/pgvector:pg16 locally — so the engine version is pinned to 16.x and
 * the extension is allowlisted for preload rather than left to chance.
 */

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-postgres"
  subnet_ids = var.subnet_ids
  tags       = merge(var.tags, { Name = "${var.name_prefix}-postgres" })
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-postgres"
  description = "Postgres access from inside the VPC only"
  vpc_id      = var.vpc_id

  ingress {
    description = "Postgres from within the VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # No egress rules: the database has no reason to originate connections, and
  # it sits in a subnet with no internet route anyway.

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres" })
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name_prefix}-postgres16"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    # Changing preloaded libraries requires a restart, not a reload.
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log anything slower than a second
  }

  # Force TLS. The Node clients all support it, and an unencrypted hop inside
  # the VPC is still an unencrypted hop.
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_password" "master" {
  length = 32
  # RDS rejects '/', '@', '"' and space in master passwords.
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "credentials" {
  name        = "${var.name_prefix}/postgres"
  description = "Master credentials for ${var.name_prefix} PostgreSQL"

  # Zero would delete immediately with no recovery window.
  recovery_window_in_days = 7

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "credentials" {
  secret_id = aws_secretsmanager_secret.credentials.id

  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "postgres"
    host     = aws_db_instance.primary.address
    port     = aws_db_instance.primary.port
    dbname   = var.database_name
    # The exact shape the services expect in DATABASE_URL.
    url = "postgresql://${var.master_username}:${random_password.master.result}@${aws_db_instance.primary.endpoint}/${var.database_name}?sslmode=require"
  })
}

resource "aws_db_instance" "primary" {
  identifier = "${var.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  publicly_accessible    = false

  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"
  copy_tags_to_snapshot   = true

  performance_insights_enabled    = true
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  auto_minor_version_upgrade = true
  deletion_protection        = var.deletion_protection
  # Taking a final snapshot is the difference between a bad afternoon and an
  # unrecoverable one.
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name_prefix}-postgres-final"

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres" })

  lifecycle {
    # Rotating the master password should go through Secrets Manager, not a
    # Terraform diff that would trigger a modify on every apply.
    ignore_changes = [password]
  }
}

resource "aws_db_instance" "replica" {
  count = var.read_replica_count

  identifier          = "${var.name_prefix}-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = var.instance_class

  vpc_security_group_ids = [aws_security_group.this.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  publicly_accessible    = false

  performance_insights_enabled    = true
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Replicas are rebuildable from the primary, so a final snapshot is pure cost.
  skip_final_snapshot = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres-replica-${count.index + 1}" })
}

resource "aws_iam_role" "monitoring" {
  name = "${var.name_prefix}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "monitoring" {
  role       = aws_iam_role.monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
