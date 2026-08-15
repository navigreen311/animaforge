variable "name_prefix" {
  description = "Prefix for resource names, e.g. animaforge-production."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "availability_zone_count" {
  description = "How many AZs to spread subnets across."
  type        = number
}

variable "flow_log_retention_days" {
  description = "CloudWatch retention for VPC flow logs."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to every resource."
  type        = map(string)
  default     = {}
}
