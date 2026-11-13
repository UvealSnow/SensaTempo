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
