# One site: static production (S3 + CloudFront), SSR preview (Lambda), Storyblok publish webhook,
# contact form (Lambda + SES), CI deploy role and alarms. Every name is prefixed with var.name and
# its secrets live under SSM /<name>/. Account-wide pieces (OIDC provider, OAC, alerts topic,
# budget) are passed in from the root.

locals {
  preview_function_name = "${var.name}-preview-ssr"
  ssm_prefix            = "/${var.name}"
  attach_domain         = var.domain != null && var.attach_domain
  ses_domain            = var.domain != null && var.ses_domain
}

data "aws_caller_identity" "current" {}

# The site's region (the module's default provider); CloudFront, IAM and Route 53 are global
data "aws_region" "current" {}

# --- 0. SECRETS: SSM PARAMETER STORE (SecureString, free standard tier) ---
# Created once by hand so values never live in code (see README "Secrets"); Terraform only reads them.
#   /<name>/storyblok/public-token         read by CI to build the static site (published content)
#   /<name>/storyblok/preview-token        read by CI and the preview Lambda (draft content, editor auth)
#   /<name>/preview/basic-auth-user        preview Lambda basic auth
#   /<name>/preview/basic-auth-password

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
  bucket = "${var.name}-prod-assets"
}

# Keep the bucket private
resource "aws_s3_bucket_public_access_block" "prod_assets" {
  bucket                  = aws_s3_bucket.prod_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 REST origins don't resolve /es/about/ to /es/about/index.html, and there is no root page,
# so rewrite directory URLs and send / to /es/ or /en/ by the browser's preferred language.
# A www. host is redirected to the bare domain.
# The 302 is generated at viewer-request, so nothing is cached per language.
# Tested by terraform/rewrite-index.test.mjs (pnpm test), which extracts this heredoc.
resource "aws_cloudfront_function" "rewrite_index" {
  name    = "${var.name}-rewrite-index"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    // Spanish when the highest-q Accept-Language entry is es or es-*; ties keep header order.
    // Same rule as pickLanguage in src/utils/language.ts (the 404 page): keep them in sync
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

      // www.<domain> → <domain>, one canonical host (both are aliases of the distribution)
      var host = request.headers.host ? request.headers.host.value : '';
      if (host.indexOf('www.') === 0) {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: { location: { value: 'https://' + host.slice(4) + uri } },
        };
      }

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
  aliases     = local.attach_domain ? [var.domain, "www.${var.domain}"] : []

  origin {
    domain_name              = aws_s3_bucket.prod_assets.bucket_regional_domain_name
    origin_id                = "S3-Production"
    origin_access_control_id = var.origin_access_control_id
  }

  origin {
    domain_name = local.contact_origin_domain
    origin_id   = "Lambda-Contact"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/contact"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "Lambda-Contact"
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    viewer_protocol_policy   = "https-only"
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

  # Missing objects come back from S3 as 403 (OAC only grants s3:GetObject), so both map to the
  # 404 page; it picks its language in the browser (src/pages/404.astro)
  dynamic "custom_error_response" {
    for_each = [403, 404]
    content {
      error_code            = custom_error_response.value
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 60
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.attach_domain
    acm_certificate_arn            = local.attach_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    ssl_support_method             = local.attach_domain ? "sni-only" : null
    minimum_protocol_version       = local.attach_domain ? "TLSv1.2_2021" : null
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
  name = coalesce(var.preview_role_name, "${var.name}-preview-lambda")
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
  output_path = "${path.root}/.build/${var.name}-preview-placeholder.zip"

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
  layers = ["arn:aws:lambda:${data.aws_region.current.region}:753240598075:layer:LambdaAdapterLayerArm64:${var.lambda_web_adapter_layer_version}"]

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
  name    = "${var.name}-preview-encode-query"
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
  comment         = "${var.display_name} preview (Storyblok Visual Editor)"
  aliases         = local.attach_domain ? ["preview.${var.domain}"] : []

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

  origin {
    domain_name = local.contact_origin_domain
    origin_id   = "Lambda-Contact"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Same endpoint as prod, so the preview's form really sends
  ordered_cache_behavior {
    path_pattern             = "/api/contact"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "Lambda-Contact"
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    viewer_protocol_policy   = "https-only"
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
    cloudfront_default_certificate = !local.attach_domain
    acm_certificate_arn            = local.attach_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    ssl_support_method             = local.attach_domain ? "sni-only" : null
    minimum_protocol_version       = local.attach_domain ? "TLSv1.2_2021" : null
  }
}

# --- 3. CI: GITHUB ACTIONS OIDC (NO LONG-LIVED KEYS) ---

resource "aws_iam_role" "github_deploy" {
  name = "${var.name}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = var.github_oidc_provider_arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Deploy jobs run in this site's GitHub Environment, which only allows the main branch
          # (README "Sites in CI"); the ref:main subject covers jobs without an environment
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_repository}:environment:${var.name}",
            "repo:${var.github_repository}:ref:refs/heads/main",
          ]
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
        Resource = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/storyblok/*"
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

# --- 4. STORYBLOK PUBLISH WEBHOOK: RELAY LAMBDA -> GITHUB repository_dispatch ---
# Storyblok can't send an Authorization header, so this verifies its webhook-signature and calls
# GitHub's dispatches API, which runs prod-deploy.yaml on main. Code: webhook/index.mjs (no deps).
# SSM parameters, created by hand like the ones above:
#   /<name>/storyblok/webhook-secret   also entered in Storyblok's webhook settings
#   /<name>/github/dispatch-token      fine-grained PAT, this repo only, Contents: read & write

locals {
  webhook_function_name = "${var.name}-storyblok-webhook"
}

data "aws_ssm_parameter" "storyblok_webhook_secret" {
  name = "${local.ssm_prefix}/storyblok/webhook-secret"
}

data "aws_ssm_parameter" "github_dispatch_token" {
  name = "${local.ssm_prefix}/github/dispatch-token"
}

resource "aws_iam_role" "storyblok_webhook" {
  name = local.webhook_function_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Logs only: the secrets arrive as env vars, so no SSM access at runtime
resource "aws_iam_role_policy_attachment" "storyblok_webhook_logs" {
  role       = aws_iam_role.storyblok_webhook.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "storyblok_webhook" {
  name              = "/aws/lambda/${local.webhook_function_name}"
  retention_in_days = 14
}

# Only the handler; index.test.mjs stays out of the package
data "archive_file" "storyblok_webhook" {
  type        = "zip"
  source_file = "${path.module}/../../webhook/index.mjs"
  output_path = "${path.root}/.build/${var.name}-storyblok-webhook.zip"
}

resource "aws_lambda_function" "storyblok_webhook" {
  function_name = local.webhook_function_name
  role          = aws_iam_role.storyblok_webhook.arn
  runtime       = "nodejs24.x"
  handler       = "index.handler"
  architectures = ["arm64"]

  filename         = data.archive_file.storyblok_webhook.output_path
  source_code_hash = data.archive_file.storyblok_webhook.output_base64sha256

  timeout     = 10
  memory_size = 128
  # Caps cost if the public URL is flooded; Storyblok sends one request per event
  reserved_concurrent_executions = 2

  environment {
    variables = {
      SITE                     = var.name
      STORYBLOK_WEBHOOK_SECRET = data.aws_ssm_parameter.storyblok_webhook_secret.value
      GITHUB_DISPATCH_TOKEN    = data.aws_ssm_parameter.github_dispatch_token.value
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.storyblok_webhook,
    aws_iam_role_policy_attachment.storyblok_webhook_logs,
  ]
}

# Public: Storyblok can't sign AWS requests. The handler rejects anything without a valid signature.
resource "aws_lambda_function_url" "storyblok_webhook" {
  function_name      = aws_lambda_function.storyblok_webhook.function_name
  authorization_type = "NONE"
}

# authorization_type NONE still needs the resource policy (see preview_function_url_public)
resource "aws_lambda_permission" "storyblok_webhook_function_url_public" {
  statement_id           = "AllowPublicFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.storyblok_webhook.function_name
  principal              = "*"
  function_url_auth_type = "NONE"

  depends_on = [aws_lambda_function_url.storyblok_webhook]
}

# --- 5. ALERTS: WEBHOOK AND CONTACT ALARMS -> THE SHARED SNS TOPIC ---

locals {
  # Matched against the relay's log lines (terraform/webhook/index.mjs)
  webhook_metrics = {
    dispatched   = "\"dispatched\""
    unauthorized = "\"unauthorized\""
    failed       = "?\"dispatch failed\" ?\"dispatch rejected\""
  }
}

resource "aws_cloudwatch_log_metric_filter" "storyblok_webhook" {
  for_each       = local.webhook_metrics
  name           = "storyblok-webhook-${each.key}"
  log_group_name = aws_cloudwatch_log_group.storyblok_webhook.name
  pattern        = each.value

  metric_transformation {
    name          = "Webhook${title(each.key)}"
    namespace     = var.metric_namespace
    value         = "1"
    default_value = "0"
  }
}

# Normal editing is a handful of publishes per session; sustained spam (a leaked key) crosses this fast
resource "aws_cloudwatch_metric_alarm" "webhook_too_many_rebuilds" {
  alarm_name          = "${var.name}-webhook-too-many-rebuilds"
  alarm_description   = "More than 30 production rebuilds triggered by the Storyblok webhook in 1 hour. If it isn't bulk publishing, rotate ${local.ssm_prefix}/storyblok/webhook-secret."
  namespace           = var.metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.storyblok_webhook["dispatched"].metric_transformation[0].name
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 30
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

# Real Storyblok calls never 401: someone is probing the URL, or the key changed without updating Storyblok
resource "aws_cloudwatch_metric_alarm" "webhook_unauthorized" {
  alarm_name          = "${var.name}-webhook-unauthorized"
  alarm_description   = "More than 50 rejected (401) calls to the Storyblok webhook in 5 minutes."
  namespace           = var.metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.storyblok_webhook["unauthorized"].metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 50
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

# Publishes silently not reaching prod, usually an expired <ssm_prefix>/github/dispatch-token
resource "aws_cloudwatch_metric_alarm" "webhook_failed" {
  alarm_name          = "${var.name}-webhook-failed"
  alarm_description   = "The Storyblok webhook couldn't trigger a production rebuild (GitHub refused or was unreachable). Check the dispatch token."
  namespace           = var.metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.storyblok_webhook["failed"].metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

# --- 6. CONTACT FORM: LAMBDA -> SES ---
# The form posts to /api/contact on the site's own domain; both distributions route that path here.
# Code: contact/index.mjs. SSM parameters, created by hand:
#   /<name>/contact/recipient          String; gets the messages and is the verified sender.
#                                          To change it: put-parameter, `pnpm tf:apply`, click the SES link
#   /<name>/contact/turnstile-secret   Cloudflare Turnstile secret key

locals {
  contact_function_name = "${var.name}-contact"
  contact_origin_domain = trimsuffix(trimprefix(aws_lambda_function_url.contact.function_url, "https://"), "/")
}

data "aws_ssm_parameter" "contact_recipient" {
  name = "${local.ssm_prefix}/contact/recipient"
}

data "aws_ssm_parameter" "turnstile_secret" {
  name = "${local.ssm_prefix}/contact/turnstile-secret"
}

# AWS emails a verification link; SES won't send from or (in the sandbox) to it until it's clicked
resource "aws_sesv2_email_identity" "contact" {
  # A verified domain (ses_domain) already covers a recipient on that domain
  count          = local.ses_domain ? 0 : 1
  email_identity = data.aws_ssm_parameter.contact_recipient.value
}

resource "aws_iam_role" "contact" {
  name = local.contact_function_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "contact_logs" {
  role       = aws_iam_role.contact.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "contact_send" {
  name = "send-from-contact-identity"
  role = aws_iam_role.contact.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "ses:SendEmail"
      Resource = local.ses_domain ? aws_sesv2_email_identity.domain[0].arn : aws_sesv2_email_identity.contact[0].arn
    }]
  })
}

resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${local.contact_function_name}"
  retention_in_days = 14
}

data "archive_file" "contact" {
  type        = "zip"
  source_file = "${path.module}/../../contact/index.mjs"
  output_path = "${path.root}/.build/${var.name}-contact.zip"
}

resource "aws_lambda_function" "contact" {
  function_name = local.contact_function_name
  role          = aws_iam_role.contact.arn
  runtime       = "nodejs24.x"
  handler       = "index.handler"
  architectures = ["arm64"]

  filename         = data.archive_file.contact.output_path
  source_code_hash = data.archive_file.contact.output_base64sha256

  timeout                        = 10
  memory_size                    = 128
  reserved_concurrent_executions = 2

  environment {
    variables = merge(
      {
        CONTACT_RECIPIENT = data.aws_ssm_parameter.contact_recipient.value
        SENDER_NAME       = var.display_name
        TURNSTILE_SECRET  = data.aws_ssm_parameter.turnstile_secret.value
        ALLOWED_ORIGINS   = join(",", var.contact_allowed_origins)
      },
      local.ses_domain ? { CONTACT_SENDER = "noreply@${var.domain}" } : {},
    )
  }

  depends_on = [
    aws_cloudwatch_log_group.contact,
    aws_iam_role_policy_attachment.contact_logs,
  ]
}

# Public, like the webhook: CloudFront forwards visitors' requests unsigned. The handler checks the
# Origin header and a Turnstile token before sending anything.
resource "aws_lambda_function_url" "contact" {
  function_name      = aws_lambda_function.contact.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "contact_function_url_public" {
  statement_id           = "AllowPublicFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.contact.function_name
  principal              = "*"
  function_url_auth_type = "NONE"

  depends_on = [aws_lambda_function_url.contact]
}

locals {
  # Matched against the handler's log lines (terraform/contact/index.mjs)
  contact_metrics = {
    sent    = "\"sent\""
    failed  = "\"send failed\""
    captcha = "\"captcha failed\""
  }
}

resource "aws_cloudwatch_log_metric_filter" "contact" {
  for_each       = local.contact_metrics
  name           = "contact-${each.key}"
  log_group_name = aws_cloudwatch_log_group.contact.name
  pattern        = each.value

  metric_transformation {
    name          = "Contact${title(each.key)}"
    namespace     = var.metric_namespace
    value         = "1"
    default_value = "0"
  }
}

# Usually an unverified or changed recipient (SES rejects it), or the sandbox's 200/day limit
resource "aws_cloudwatch_metric_alarm" "contact_failed" {
  alarm_name          = "${var.name}-contact-failed"
  alarm_description   = "The contact form couldn't send a message through SES. Check that ${local.ssm_prefix}/contact/recipient is verified in SES."
  namespace           = var.metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.contact["failed"].metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

# Spam that got past Turnstile
resource "aws_cloudwatch_metric_alarm" "contact_too_many" {
  alarm_name          = "${var.name}-contact-too-many"
  alarm_description   = "More than 20 contact messages sent in 1 hour."
  namespace           = var.metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.contact["sent"].metric_transformation[0].name
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 20
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}
