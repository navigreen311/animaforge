output "primary_endpoint" {
  description = "Primary endpoint for writes."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint, load balanced across replicas."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "auth_token_secret_arn" {
  description = "Secrets Manager ARN holding the auth token and a ready-made REDIS_URL."
  value       = aws_secretsmanager_secret.auth_token.arn
}
