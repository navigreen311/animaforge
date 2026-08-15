terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Backend is intentionally partial: `terraform init -backend-config=...`
  # supplies the bucket per environment, and `-backend=false` lets CI run
  # `validate` without any credentials at all.
  backend "s3" {}
}
