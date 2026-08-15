/**
 * Object storage and CDN.
 *
 * Two buckets with different access patterns:
 *
 *   assets   uploads — reference images, audio, brand kits. Private, read by
 *            the services via IAM.
 *   outputs  generated renders. Served publicly through CloudFront, never
 *            directly from S3.
 *
 * The outputs bucket blocks all public access and is reachable only via the
 * CloudFront origin access control. That matters beyond tidiness: every output
 * carries C2PA provenance and a watermark, and a direct S3 URL would let
 * someone bypass the CDN's signed-URL and referrer controls entirely.
 */

locals {
  assets_bucket  = "${var.name_prefix}-assets"
  outputs_bucket = "${var.name_prefix}-outputs"
  logs_bucket    = "${var.name_prefix}-logs"
}

/* -- logs ------------------------------------------------------------------ */

resource "aws_s3_bucket" "logs" {
  bucket        = local.logs_bucket
  force_destroy = false
  tags          = merge(var.tags, { Name = local.logs_bucket })
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    # CloudFront log delivery writes with an ACL, which BucketOwnerEnforced
    # would reject outright.
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = var.log_retention_days
    }
  }
}

/* -- assets ---------------------------------------------------------------- */

resource "aws_s3_bucket" "assets" {
  bucket        = local.assets_bucket
  force_destroy = false
  tags          = merge(var.tags, { Name = local.assets_bucket })
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    # Uploads are user-supplied originals: an accidental overwrite is not
    # regenerable the way a render is.
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    # Presigned browser uploads from the web app.
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

/* -- outputs --------------------------------------------------------------- */

resource "aws_s3_bucket" "outputs" {
  bucket        = local.outputs_bucket
  force_destroy = false
  tags          = merge(var.tags, { Name = local.outputs_bucket })
}

resource "aws_s3_bucket_public_access_block" "outputs" {
  bucket                  = aws_s3_bucket.outputs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  rule {
    id     = "tier-cold-renders"
    status = "Enabled"

    filter {}

    transition {
      days          = var.output_retention_days
      storage_class = "STANDARD_IA"
    }

    # Abandoned multipart uploads are invisible in the console but still billed.
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

/* -- CDN ------------------------------------------------------------------- */

resource "aws_cloudfront_origin_access_control" "outputs" {
  name                              = "${var.name_prefix}-outputs-oac"
  description                       = "CloudFront to S3 for generated outputs"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "outputs" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.name_prefix} generated outputs"
  price_class     = var.price_class
  aliases         = var.cdn_aliases

  origin {
    domain_name              = aws_s3_bucket.outputs.bucket_regional_domain_name
    origin_id                = "outputs-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.outputs.id
  }

  default_cache_behavior {
    target_origin_id       = "outputs-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed policies, referenced by their fixed well-known ids.
    # CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    # CORS-S3Origin
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == null
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn == null ? null : "sni-only"
    minimum_protocol_version       = var.acm_certificate_arn == null ? "TLSv1" : "TLSv1.2_2021"
  }

  logging_config {
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-cdn" })
}

# Only CloudFront may read the outputs bucket. Anything else, including a
# leaked object key, gets AccessDenied straight from S3.
data "aws_iam_policy_document" "outputs" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.outputs.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.outputs.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "outputs" {
  bucket = aws_s3_bucket.outputs.id
  policy = data.aws_iam_policy_document.outputs.json
}

/* -- application IAM ------------------------------------------------------- */

data "aws_iam_policy_document" "app_access" {
  statement {
    sid    = "ReadWriteObjects"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
    ]

    resources = [
      "${aws_s3_bucket.assets.arn}/*",
      "${aws_s3_bucket.outputs.arn}/*",
    ]
  }

  statement {
    sid       = "ListBuckets"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.assets.arn, aws_s3_bucket.outputs.arn]
  }
}

resource "aws_iam_policy" "app_access" {
  name        = "${var.name_prefix}-s3-access"
  description = "Read/write access to the AnimaForge asset and output buckets"
  policy      = data.aws_iam_policy_document.app_access.json
  tags        = var.tags
}
