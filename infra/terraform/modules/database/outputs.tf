output "endpoint" {
  description = "host:port for the primary."
  value       = aws_db_instance.primary.endpoint
}

output "address" {
  description = "Hostname of the primary."
  value       = aws_db_instance.primary.address
}

output "replica_endpoints" {
  description = "Read replica endpoints, for read-heavy queries."
  value       = aws_db_instance.replica[*].endpoint
}

output "security_group_id" {
  description = "Security group guarding Postgres."
  value       = aws_security_group.this.id
}

output "credentials_secret_arn" {
  description = "Secrets Manager ARN holding the master credentials and a ready-made DATABASE_URL."
  value       = aws_secretsmanager_secret.credentials.arn
}

output "database_name" {
  description = "Initial database name."
  value       = aws_db_instance.primary.db_name
}
