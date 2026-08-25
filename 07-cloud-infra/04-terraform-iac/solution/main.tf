terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for all resources in this stack."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally-unique S3 bucket name (org-prefixed)."
  type        = string

  validation {
    condition     = length(var.bucket_name) >= 3
    error_message = "bucket_name must be at least 3 characters."
  }
}

resource "aws_s3_bucket" "app" {
  bucket = var.bucket_name

  tags = {
    Environment = "dev"
    ManagedBy   = "terraform"
    Product     = "backend-mastery"
  }
}

output "bucket_name" {
  description = "Name of the application bucket."
  value       = aws_s3_bucket.app.id
}
