output "vpc_id" {
  description = "VPC id."
  value       = module.network.vpc_id
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = module.kubernetes.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = module.kubernetes.cluster_endpoint
}

output "kubeconfig_command" {
  description = "Run this to point kubectl at the cluster before applying k8s/."
  value       = module.kubernetes.kubeconfig_command
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN, for IRSA service account roles."
  value       = module.kubernetes.oidc_provider_arn
}

output "postgres_endpoint" {
  description = "Primary Postgres endpoint."
  value       = module.database.endpoint
}

output "postgres_replica_endpoints" {
  description = "Read replica endpoints."
  value       = module.database.replica_endpoints
}

output "postgres_credentials_secret_arn" {
  description = <<-EOT
    Secrets Manager ARN holding the Postgres credentials and a ready-made
    DATABASE_URL. The connection string is deliberately not a Terraform output:
    outputs land in state and in CI logs.
  EOT
  value       = module.database.credentials_secret_arn
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint."
  value       = module.cache.primary_endpoint
}

output "redis_auth_token_secret_arn" {
  description = "Secrets Manager ARN holding the Redis auth token and REDIS_URL."
  value       = module.cache.auth_token_secret_arn
}

output "assets_bucket" {
  description = "S3 bucket for user uploads."
  value       = module.storage.assets_bucket
}

output "outputs_bucket" {
  description = "S3 bucket for generated renders."
  value       = module.storage.outputs_bucket
}

output "cdn_domain_name" {
  description = "CloudFront domain serving generated outputs."
  value       = module.storage.cdn_domain_name
}

output "cdn_distribution_id" {
  description = "Distribution id, for cache invalidation from CI."
  value       = module.storage.cdn_distribution_id
}
