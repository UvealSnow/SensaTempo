output "cloudfront_domain" {
  value = aws_cloudfront_distribution.prod_site.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.prod_site.id
}

output "prod_bucket" {
  value = aws_s3_bucket.prod_assets.bucket
}

output "preview_lambda_url" {
  value = aws_lambda_function_url.preview_url.function_url
}

# Use this one (not the Function URL) as the Storyblok preview URL
output "preview_url" {
  value = "https://${aws_cloudfront_distribution.preview.domain_name}/"
}

output "preview_function_name" {
  value = aws_lambda_function.preview_ssr.function_name
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

# Storyblok → Settings → Webhooks → URL
output "storyblok_webhook_url" {
  value = aws_lambda_function_url.storyblok_webhook.function_url
}

output "site_url" {
  value = local.attach_domain ? "https://${var.domain}" : "https://${aws_cloudfront_distribution.prod_site.domain_name}"
}
