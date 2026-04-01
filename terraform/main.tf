terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1" # Recommended for CloudFront/ACM ease
}

# --- 1. PRODUCTION: S3 + CLOUDFRONT (STATIC) ---

resource "aws_s3_bucket" "prod_assets" {
  bucket = "sensatempo-prod-assets"
}

# Keep the bucket private
resource "aws_s3_bucket_public_access_block" "prod_assets" {
  bucket                  = aws_s3_bucket.prod_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control (The modern OAI)
resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "prod_site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.prod_assets.bucket_regional_domain_name
    origin_id                = "S3-Production"
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Production"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Bucket policy to allow CloudFront OAC to read files
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.prod_assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipalReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.prod_assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.prod_site.arn
        }
      }
    }]
  })
}

# --- 2. PREVIEW: ECR + LAMBDA (SSR CONTAINER) ---

resource "aws_ecr_repository" "preview_app" {
  name                 = "sensatempo-preview"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # Allows terraform destroy even if images exist
}

resource "aws_iam_role" "lambda_exec" {
  name = "preview_lambda_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "preview_ssr" {
  function_name = "sensatempo-preview-ssr"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  architectures = ["arm64"] # Cheaper and faster

  # Placeholder image (GitHub Actions will update this later)
  image_uri = "${aws_ecr_repository.preview_app.repository_url}:latest"

  timeout     = 30
  memory_size = 512

  environment {
    variables = {
      AWS_LAMBDA_WEB_ADAPTER_PORT = "8080"
    }
  }

  lifecycle {
    ignore_changes = [image_uri] # Don't overwrite the GitHub Action's deployment
  }
}

# The public URL for Storyblok to hit
resource "aws_lambda_function_url" "preview_url" {
  function_name      = aws_lambda_function.preview_ssr.function_name
  authorization_type = "NONE" # Publicly accessible for the preview domain
}

# --- OUTPUTS ---

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.prod_site.domain_name
}

output "preview_lambda_url" {
  value = aws_lambda_function_url.preview_url.function_url
}

output "ecr_repository_url" {
  value = aws_ecr_repository.preview_app.repository_url
}
