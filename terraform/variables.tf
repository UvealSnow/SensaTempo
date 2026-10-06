variable "preview_basic_auth_user" {
  type        = string
  default     = ""
  sensitive   = true
  description = "HTTP Basic Auth username for the preview Lambda (empty = disabled)."
}

variable "preview_basic_auth_password" {
  type        = string
  default     = ""
  sensitive   = true
  description = "HTTP Basic Auth password for the preview Lambda (empty = disabled)."
}
