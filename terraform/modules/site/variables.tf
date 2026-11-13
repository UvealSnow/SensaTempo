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
