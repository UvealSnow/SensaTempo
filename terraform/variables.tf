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

variable "kevinavila_domain_live" {
  type        = bool
  default     = false
  description = "Set to true once kevinavila.pro's nameservers point at the Route 53 zone: puts the domain on CloudFront (waits for the certificate)."
}

variable "kevinavila_zoho_dkim" {
  type = object({
    selector = string
    value    = string
  })
  default     = null
  description = "Zoho's DKIM TXT record for kevinavila.pro (a public key); null until generated in Zoho."
}
