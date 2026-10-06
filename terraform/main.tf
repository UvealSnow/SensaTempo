terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # State bucket is created once by hand (see README); S3-native locking needs no DynamoDB table
  backend "s3" {
    bucket       = "sensatempo-tfstate-221135164152"
    key          = "sensatempo/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"
}

# Everything here is pay-per-use: no always-on servers, load balancers or NAT gateways.

locals {
  preview_function_name = "sensatempo-preview-ssr"
  ssm_prefix            = "/sensatempo"
}

data "aws_caller_identity" "current" {}

# --- 0. SECRETS: SSM PARAMETER STORE (SecureString, free standard tier) ---
# Created once by hand so values never live in code (see README "Secrets"); Terraform only reads them.
#   /sensatempo/storyblok/public-token         read by CI to build the static site (published content)
#   /sensatempo/storyblok/preview-token        read by CI and the preview Lambda (draft content, editor auth)
#   /sensatempo/preview/basic-auth-user        preview Lambda basic auth
#   /sensatempo/preview/basic-auth-password

data "aws_ssm_parameter" "storyblok_preview_token" {
  name = "${local.ssm_prefix}/storyblok/preview-token"
}

data "aws_ssm_parameter" "preview_basic_auth_user" {
  name = "${local.ssm_prefix}/preview/basic-auth-user"
}

data "aws_ssm_parameter" "preview_basic_auth_password" {
  name = "${local.ssm_prefix}/preview/basic-auth-password"
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

# S3 REST origins don't resolve /es/about/ to /es/about/index.html, and there is no root page,
# so rewrite directory URLs and send / to /es/ or /en/ by the browser's preferred language.
# The 302 is generated at viewer-request, so nothing is cached per language.
# Tested by terraform/rewrite-index.test.mjs (pnpm test), which extracts this heredoc.
resource "aws_cloudfront_function" "rewrite_index" {
  name    = "sensatempo-rewrite-index"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    // Spanish when the highest-q Accept-Language entry is es or es-*; ties keep header order
    function prefersSpanish(header) {
      var best = '';
      var bestQ = 0;
      var entries = header.split(',');

      for (var i = 0; i < entries.length; i++) {
        var params = entries[i].split(';');
        var tag = params[0].trim().toLowerCase();
        var q = 1;
        for (var j = 1; j < params.length; j++) {
          var param = params[j].trim().toLowerCase();
          if (param.indexOf('q=') === 0) q = parseFloat(param.slice(2));
        }
        if (tag && q > bestQ) {
          best = tag;
          bestQ = q;
        }
      }

      return best === 'es' || best.indexOf('es-') === 0;
    }

    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      if (uri === '/') {
        var acceptLanguage = request.headers['accept-language'];
        // No header (crawlers) → English; hreflang alternates point them at /es/ too
        var lang =
          acceptLanguage && prefersSpanish(acceptLanguage.value) ? 'es' : 'en';
        return {
          statusCode: 302,
          statusDescription: 'Found',
          headers: { location: { value: '/' + lang + '/' } },
        };
      }

      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.split('/').pop().includes('.')) {
        request.uri += '/index.html';
      }

      return request;
    }
  EOT
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "prod_site" {
  enabled         = true
  is_ipv6_enabled = true
  # North America + Europe edges only: cheapest tier, still covers Mexico
  price_class = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.prod_assets.bucket_regional_domain_name
    origin_id                = "S3-Production"
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-Production"
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_index.arn
    }
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

# --- 2. PREVIEW: LAMBDA (SSR, ZIP + LAMBDA WEB ADAPTER LAYER) ---

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

# Created up front so logs expire instead of being kept (and billed) forever
resource "aws_cloudwatch_log_group" "preview_ssr" {
  name              = "/aws/lambda/${local.preview_function_name}"
  retention_in_days = 14
}

# Placeholder code so the function can be created; CI deploys the real package (scripts/package-preview.sh)
data "archive_file" "preview_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.build/preview-placeholder.zip"

  source {
    filename = "run.sh"
    content  = "#!/bin/sh\necho 'Preview not deployed yet' >&2\nexit 1\n"
  }
}

resource "aws_lambda_function" "preview_ssr" {
  function_name = local.preview_function_name
  role          = aws_iam_role.lambda_exec.arn
  runtime       = "nodejs24.x"
  handler       = "run.sh"
  architectures = ["arm64"] # Cheaper and faster

  filename         = data.archive_file.preview_placeholder.output_path
  source_code_hash = data.archive_file.preview_placeholder.output_base64sha256

  # Runs run.sh as a normal Node server and translates Lambda events to HTTP
  layers = ["arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerArm64:${var.lambda_web_adapter_layer_version}"]

  timeout     = 30
  memory_size = 512

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER          = "/opt/bootstrap"
      AWS_LWA_PORT                     = "8080"
      AWS_LWA_READINESS_CHECK_PROTOCOL = "tcp" # "/" may answer 401 (basic auth) or 404
      HOST                             = "127.0.0.1"
      PORT                             = "8080"
      NODE_ENV                         = "production"
      PREVIEW_BASIC_AUTH_USER          = data.aws_ssm_parameter.preview_basic_auth_user.value
      PREVIEW_BASIC_AUTH_PASSWORD      = data.aws_ssm_parameter.preview_basic_auth_password.value
      STORYBLOK_PREVIEW_TOKEN          = data.aws_ssm_parameter.storyblok_preview_token.value # drafts + editor auth
    }
  }

  # Code is deployed by CI / `make deploy-preview`; apply would otherwise roll it back to the placeholder.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [
    aws_cloudwatch_log_group.preview_ssr,
    aws_iam_role_policy_attachment.lambda_logs,
  ]
}

# The public URL for Storyblok to hit (free; protected by basic auth in src/middleware.ts)
resource "aws_lambda_function_url" "preview_url" {
  function_name      = aws_lambda_function.preview_ssr.function_name
  authorization_type = "NONE"
}

# Function URLs do not invoke the function until the resource policy allows it.
# Without this, browsers get: {"Message":"Forbidden"...} (authorization_type NONE still needs InvokeFunctionUrl).
resource "aws_lambda_permission" "preview_function_url_public" {
  statement_id           = "AllowPublicFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.preview_ssr.function_name
  principal              = "*"
  function_url_auth_type = "NONE"

  # URL config must exist; avoids rare ordering/drift where permission applies before URL exists.
  depends_on = [aws_lambda_function_url.preview_url]
}

# Function URLs reject query keys containing [ or ] (InvalidQueryStringException), and the Storyblok
# Visual Editor sends its auth as _storyblok_tk[token]=... unencoded. CloudFront accepts them, so this
# function percent-encodes the keys before forwarding; Astro decodes them back for the middleware.
resource "aws_cloudfront_function" "preview_encode_query" {
  name    = "sensatempo-preview-encode-query"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var qs = request.querystring;
      var out = {};

      for (var key in qs) {
        out[key.replace(/\[/g, '%5B').replace(/\]/g, '%5D')] = qs[key];
      }
      request.querystring = out;

      return request;
    }
  EOT
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Everything but Host (the Function URL needs its own), including Authorization and cookies
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# Pay-per-request like the rest; no caching, the preview is always rendered fresh
resource "aws_cloudfront_distribution" "preview" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"
  comment         = "SensaTempo preview (Storyblok Visual Editor)"

  origin {
    domain_name = trimsuffix(trimprefix(aws_lambda_function_url.preview_url.function_url, "https://"), "/")
    origin_id   = "Lambda-Preview"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    # POST for Storyblok live preview
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "Lambda-Preview"
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
    viewer_protocol_policy   = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.preview_encode_query.arn
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# --- 3. CI: GITHUB ACTIONS OIDC (NO LONG-LIVED KEYS) ---

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github_deploy" {
  name = "sensatempo-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Only workflows running on main can deploy
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
        }
      }
    }]
  })
}

# Just enough to deploy: read build secrets, sync the prod bucket, invalidate the CDN, update the preview code
resource "aws_iam_role_policy" "github_deploy" {
  name = "deploy"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # SecureStrings use the AWS-managed aws/ssm key, so no kms:Decrypt grant is needed
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/storyblok/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.prod_assets.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.prod_assets.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.prod_site.arn
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"]
        Resource = aws_lambda_function.preview_ssr.arn
      },
    ]
  })
}

# --- OUTPUTS ---

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.prod_site.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.prod_site.id
}

output "prod_bucket" {
  value = aws_s3_bucket.prod_assets.bucket
}

output "preview_lambda_url" {
  value = aws_lambda_function_url.preview_url.function_url
}

# Use this one (not the Function URL) as the Storyblok preview URL
output "preview_url" {
  value = "https://${aws_cloudfront_distribution.preview.domain_name}/"
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
