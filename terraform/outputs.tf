# SensaTempo (names kept from before the module, for the README and the repository variables)

output "cloudfront_domain" {
  value = module.sensatempo.cloudfront_domain
}

output "cloudfront_distribution_id" {
  value = module.sensatempo.cloudfront_distribution_id
}

output "prod_bucket" {
  value = module.sensatempo.prod_bucket
}

output "preview_lambda_url" {
  value = module.sensatempo.preview_lambda_url
}

output "preview_url" {
  value = module.sensatempo.preview_url
}

output "github_deploy_role_arn" {
  value = module.sensatempo.github_deploy_role_arn
}

output "storyblok_webhook_url" {
  value = module.sensatempo.storyblok_webhook_url
}

# kevinavila.pro

output "kevinavila_name_servers" {
  description = "Enter these at GoDaddy (Nameservers → I'll use my own)."
  value       = aws_route53_zone.kevinavila.name_servers
}

output "kevinavila" {
  value = {
    site_url                   = module.kevinavila.site_url
    cloudfront_domain          = module.kevinavila.cloudfront_domain
    cloudfront_distribution_id = module.kevinavila.cloudfront_distribution_id
    prod_bucket                = module.kevinavila.prod_bucket
    preview_url                = module.kevinavila.preview_url
    preview_function_name      = module.kevinavila.preview_function_name
    region                     = module.kevinavila.region
    github_deploy_role_arn     = module.kevinavila.github_deploy_role_arn
    storyblok_webhook_url      = module.kevinavila.storyblok_webhook_url
  }
}
