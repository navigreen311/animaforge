variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "vpc_cidr" { type = string }

variable "subnet_ids" {
  description = "Isolated subnets."
  type        = list(string)
}

variable "node_type" { type = string }
variable "engine_version" { type = string }

variable "replica_count" {
  description = "Replicas per shard. Zero disables automatic failover."
  type        = number
  default     = 1
}

variable "snapshot_retention_days" {
  type    = number
  default = 5
}

variable "tags" {
  type    = map(string)
  default = {}
}
