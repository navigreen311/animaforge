output "assets_bucket" {
  description = "Bucket for user uploads."
  value       = aws_s3_bucket.assets.bucket
}

output "outputs_bucket" {
  description = "Bucket for generated renders."
  value       = aws_s3_bucket.outputs.bucket
}

output "logs_bucket" {
  description = "Bucket receiving CDN access logs."
  value       = aws_s3_bucket.logs.bucket
}

output "cdn_domain_name" {
  description = "CloudFront domain serving generated outputs."
  value       = aws_cloudfront_distribution.outputs.domain_name
}

output "cdn_distribution_id" {
  description = "Distribution id, for cache invalidation from CI."
  value       = aws_cloudfront_distribution.outputs.id
}

output "app_access_policy_arn" {
  description = "IAM policy granting the services read/write on both buckets."
  value       = aws_iam_policy.app_access.arn
}
