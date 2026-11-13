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
# One module per site (modules/site); the account-wide pieces below are shared by all of them.

# --- SHARED ---

# CloudFront Origin Access Control (The modern OAI)
resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# Alerts. Free tier: metric filters, the first 10 alarms, SNS email and the first 2 budgets cost nothing.
# The recipient lives in SSM (created by hand, like the secrets) so it stays out of this public repo.

data "aws_ssm_parameter" "alerts_email" {
  name = "/sensatempo/alerts/email"
}

resource "aws_sns_topic" "alerts" {
  name = "sensatempo-alerts"
}

# AWS emails a confirmation link; nothing is delivered until it's clicked
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = data.aws_ssm_parameter.alerts_email.value
}

# Account-wide (baseline ~$1.2/month, Route 53). Separate from the hand-made "Monthly budget" ($10).
resource "aws_budgets_budget" "sensatempo" {
  name         = "sensatempo-monthly"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [data.aws_ssm_parameter.alerts_email.value]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [data.aws_ssm_parameter.alerts_email.value]
  }
}

# --- SITES ---

module "sensatempo" {
  source = "./modules/site"

  name              = "sensatempo"
  display_name      = "SensaTempo"
  metric_namespace  = "SensaTempo"
  github_repository = var.github_repository
  # Created before the module existed; renaming would replace the role
  preview_role_name = "preview_lambda_role"
  contact_allowed_origins = [
    "https://d1fr6xerqueq2v.cloudfront.net",
    "https://d22dvpdtgdplg6.cloudfront.net",
    "https://sensatempo.com",
  ]

  lambda_web_adapter_layer_version = var.lambda_web_adapter_layer_version
  origin_access_control_id         = aws_cloudfront_origin_access_control.default.id
  github_oidc_provider_arn         = aws_iam_openid_connect_provider.github.arn
  alerts_topic_arn                 = aws_sns_topic.alerts.arn
}
