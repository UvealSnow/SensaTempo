variable "default_language" {
  type        = string
  default     = "es"
  description = "Language the site root (/) redirects to. Keep in sync with PUBLIC_DEFAULT_LANGUAGE."
}

variable "github_repository" {
  type        = string
  default     = "UvealSnow/SensaTempo"
  description = "owner/repo allowed to assume the deploy role via GitHub OIDC."
}

variable "lambda_web_adapter_layer_version" {
  type        = number
  default     = 30
  description = "Version of the public LambdaAdapterLayerArm64 layer (30 = Lambda Web Adapter 1.1.0)."
}
