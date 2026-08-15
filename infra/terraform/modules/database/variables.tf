variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "vpc_cidr" { type = string }

variable "subnet_ids" {
  description = "Isolated subnets. RDS requires at least two AZs."
  type        = list(string)
}

variable "engine_version" {
  description = "Must be 16.x — the schema depends on pgvector on PG16."
  type        = string

  validation {
    condition     = can(regex("^16[.]", var.engine_version))
    error_message = "engine_version must be 16.x; packages/db/prisma targets PostgreSQL 16 with pgvector."
  }
}

variable "instance_class" { type = string }
variable "allocated_storage" { type = number }
variable "max_allocated_storage" { type = number }
variable "multi_az" { type = bool }
variable "backup_retention_days" { type = number }

variable "read_replica_count" {
  type    = number
  default = 0
}

variable "database_name" {
  type    = string
  default = "animaforge"
}

variable "master_username" {
  type    = string
  default = "animaforge"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
