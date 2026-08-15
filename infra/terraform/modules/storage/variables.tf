variable "name_prefix" { type = string }

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}

variable "cdn_aliases" {
  description = "Custom domains for the CDN. Requires acm_certificate_arn."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = <<-EOT
    ACM certificate for cdn_aliases. Must be issued in us-east-1 — CloudFront
    reads certificates from that region regardless of where the rest of the
    stack lives. Null uses the default *.cloudfront.net certificate.
  EOT
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "Origins permitted to upload directly to the assets bucket."
  type        = list(string)
  default     = []
}

variable "output_retention_days" {
  description = "Days before generated outputs move to STANDARD_IA."
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "Days to keep CDN access logs."
  type        = number
  default     = 90
}

variable "tags" {
  type    = map(string)
  default = {}
}
