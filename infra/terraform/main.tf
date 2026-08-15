/**
 * AnimaForge infrastructure root.
 *
 * Composes the five modules into one environment. Apply with an environment
 * tfvars file:
 *
 *   terraform apply -var-file=environments/production.tfvars
 */

locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Repository  = "navigreen311/animaforge"
  })
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

module "network" {
  source = "./modules/network"

  name_prefix             = local.name_prefix
  vpc_cidr                = var.vpc_cidr
  availability_zone_count = var.availability_zone_count
  tags                    = local.common_tags
}

module "database" {
  source = "./modules/database"

  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
  vpc_cidr    = module.network.vpc_cidr
  subnet_ids  = module.network.isolated_subnet_ids

  engine_version        = var.postgres_version
  instance_class        = var.postgres_instance_class
  allocated_storage     = var.postgres_allocated_storage
  max_allocated_storage = var.postgres_max_allocated_storage
  multi_az              = var.postgres_multi_az
  backup_retention_days = var.postgres_backup_retention_days
  read_replica_count    = var.postgres_read_replica_count

  # Staging is meant to be disposable; production is not.
  deletion_protection = var.environment == "production"

  tags = local.common_tags
}

module "cache" {
  source = "./modules/cache"

  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
  vpc_cidr    = module.network.vpc_cidr
  subnet_ids  = module.network.isolated_subnet_ids

  node_type      = var.redis_node_type
  engine_version = var.redis_version
  replica_count  = var.redis_replica_count

  tags = local.common_tags
}

module "storage" {
  source = "./modules/storage"

  name_prefix           = local.name_prefix
  price_class           = var.cdn_price_class
  output_retention_days = var.output_retention_days
  cors_allowed_origins  = var.cors_allowed_origins
  cdn_aliases           = var.cdn_aliases
  acm_certificate_arn   = var.acm_certificate_arn

  tags = local.common_tags
}

module "kubernetes" {
  source = "./modules/kubernetes"

  cluster_name       = local.name_prefix
  region             = var.region
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids

  app_instance_type = var.app_node_instance_type
  app_min_size      = var.app_node_min_size
  app_max_size      = var.app_node_max_size

  gpu_enabled       = var.gpu_node_enabled
  gpu_instance_type = var.gpu_node_instance_type
  gpu_min_size      = var.gpu_node_min_size
  gpu_max_size      = var.gpu_node_max_size

  # Lets pods reach the asset and output buckets without static credentials.
  app_access_policy_arn = module.storage.app_access_policy_arn

  tags = local.common_tags
}
