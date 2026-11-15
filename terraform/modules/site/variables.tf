variable "name" {
  type        = string
  description = "Prefix for every resource name and the SSM path (/<name>/...), e.g. \"sensatempo\"."
}

variable "display_name" {
  type        = string
  description = "Human-readable site name, used in descriptions."
}

variable "metric_namespace" {
  type        = string
  description = "CloudWatch namespace for this site's webhook and contact metrics."
}

variable "github_repository" {
  type        = string
  description = "owner/repo allowed to assume the deploy role via GitHub OIDC."
}

variable "contact_allowed_origins" {
  type        = list(string)
  description = "Sites whose pages may post to the contact form (the Origin header). Literal domains: the distributions route /api/contact to the Lambda, so referencing them here would be a cycle."
}

variable "preview_role_name" {
  type        = string
  default     = null
  description = "IAM role name for the preview Lambda; defaults to <name>-preview-lambda."
}

variable "lambda_web_adapter_layer_version" {
  type        = number
  description = "Version of the public LambdaAdapterLayerArm64 layer."
}

variable "origin_access_control_id" {
  type        = string
  description = "Shared CloudFront Origin Access Control for the S3 origin."
}

variable "github_oidc_provider_arn" {
  type        = string
  description = "The account's GitHub Actions OIDC provider."
}

variable "alerts_topic_arn" {
  type        = string
  description = "SNS topic the alarms notify."
}

variable "domain" {
  type        = string
  default     = null
  description = "Custom domain (e.g. kevinavila.pro): prod on it and www., preview on preview.<domain>. Needs zone_id."
}

variable "zone_id" {
  type        = string
  default     = null
  description = "Route 53 hosted zone of var.domain."
}

variable "attach_domain" {
  type        = bool
  default     = false
  description = "Serve the distributions on var.domain. Only once the zone's nameservers are live: it waits for the certificate to validate."
}

variable "ses_domain" {
  type        = bool
  default     = false
  description = "Verify var.domain in SES (DKIM + MAIL FROM records in the zone); the contact form sends from noreply@<domain>."
}
