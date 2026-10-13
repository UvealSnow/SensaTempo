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

variable "contact_allowed_origins" {
  type = list(string)
  default = [
    "https://d1fr6xerqueq2v.cloudfront.net",
    "https://d22dvpdtgdplg6.cloudfront.net",
    "https://sensatempo.com",
  ]
  description = "Sites whose pages may post to the contact form (the Origin header). Literal domains: the distributions route /api/contact to the Lambda, so referencing them here would be a cycle."
}
