variable "cluster_name" { type = string }

variable "region" {
  description = "Region, used to build the kubeconfig command output."
  type        = string
}
variable "kubernetes_version" { type = string }
variable "vpc_id" { type = string }

variable "private_subnet_ids" {
  description = "Subnets for the worker nodes."
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Subnets for internet-facing load balancers."
  type        = list(string)
}

variable "public_access_cidrs" {
  description = <<-EOT
    CIDRs allowed to reach the public API endpoint. The default is open, which
    is fine for a control plane behind IAM auth but worth narrowing to the
    office and CI ranges once those are known.
  EOT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_instance_type" { type = string }
variable "app_min_size" { type = number }
variable "app_max_size" { type = number }

variable "gpu_enabled" {
  type    = bool
  default = false
}

variable "gpu_instance_type" {
  type    = string
  default = "g5.2xlarge"
}

variable "gpu_min_size" {
  type    = number
  default = 0
}

variable "gpu_max_size" {
  type    = number
  default = 4
}

variable "app_access_policy_arn" {
  description = "Optional IAM policy attached to the node role, e.g. S3 access."
  type        = string
  default     = null
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "tags" {
  type    = map(string)
  default = {}
}
