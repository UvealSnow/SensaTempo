# Resources created before modules/site existed (2026-11). Safe to delete once every state has applied them.

moved {
  from = aws_s3_bucket.prod_assets
  to   = module.sensatempo.aws_s3_bucket.prod_assets
}

moved {
  from = aws_s3_bucket_public_access_block.prod_assets
  to   = module.sensatempo.aws_s3_bucket_public_access_block.prod_assets
}

moved {
  from = aws_cloudfront_function.rewrite_index
  to   = module.sensatempo.aws_cloudfront_function.rewrite_index
}

moved {
  from = aws_cloudfront_distribution.prod_site
  to   = module.sensatempo.aws_cloudfront_distribution.prod_site
}

moved {
  from = aws_s3_bucket_policy.allow_cloudfront
  to   = module.sensatempo.aws_s3_bucket_policy.allow_cloudfront
}

moved {
  from = aws_iam_role.lambda_exec
  to   = module.sensatempo.aws_iam_role.lambda_exec
}

moved {
  from = aws_iam_role_policy_attachment.lambda_logs
  to   = module.sensatempo.aws_iam_role_policy_attachment.lambda_logs
}

moved {
  from = aws_cloudwatch_log_group.preview_ssr
  to   = module.sensatempo.aws_cloudwatch_log_group.preview_ssr
}

moved {
  from = aws_lambda_function.preview_ssr
  to   = module.sensatempo.aws_lambda_function.preview_ssr
}

moved {
  from = aws_lambda_function_url.preview_url
  to   = module.sensatempo.aws_lambda_function_url.preview_url
}

moved {
  from = aws_lambda_permission.preview_function_url_public
  to   = module.sensatempo.aws_lambda_permission.preview_function_url_public
}

moved {
  from = aws_cloudfront_function.preview_encode_query
  to   = module.sensatempo.aws_cloudfront_function.preview_encode_query
}

moved {
  from = aws_cloudfront_distribution.preview
  to   = module.sensatempo.aws_cloudfront_distribution.preview
}

moved {
  from = aws_iam_role.github_deploy
  to   = module.sensatempo.aws_iam_role.github_deploy
}

moved {
  from = aws_iam_role_policy.github_deploy
  to   = module.sensatempo.aws_iam_role_policy.github_deploy
}

moved {
  from = aws_iam_role.storyblok_webhook
  to   = module.sensatempo.aws_iam_role.storyblok_webhook
}

moved {
  from = aws_iam_role_policy_attachment.storyblok_webhook_logs
  to   = module.sensatempo.aws_iam_role_policy_attachment.storyblok_webhook_logs
}

moved {
  from = aws_cloudwatch_log_group.storyblok_webhook
  to   = module.sensatempo.aws_cloudwatch_log_group.storyblok_webhook
}

moved {
  from = aws_lambda_function.storyblok_webhook
  to   = module.sensatempo.aws_lambda_function.storyblok_webhook
}

moved {
  from = aws_lambda_function_url.storyblok_webhook
  to   = module.sensatempo.aws_lambda_function_url.storyblok_webhook
}

moved {
  from = aws_lambda_permission.storyblok_webhook_function_url_public
  to   = module.sensatempo.aws_lambda_permission.storyblok_webhook_function_url_public
}

moved {
  from = aws_cloudwatch_log_metric_filter.storyblok_webhook
  to   = module.sensatempo.aws_cloudwatch_log_metric_filter.storyblok_webhook
}

moved {
  from = aws_cloudwatch_metric_alarm.webhook_too_many_rebuilds
  to   = module.sensatempo.aws_cloudwatch_metric_alarm.webhook_too_many_rebuilds
}

moved {
  from = aws_cloudwatch_metric_alarm.webhook_unauthorized
  to   = module.sensatempo.aws_cloudwatch_metric_alarm.webhook_unauthorized
}

moved {
  from = aws_cloudwatch_metric_alarm.webhook_failed
  to   = module.sensatempo.aws_cloudwatch_metric_alarm.webhook_failed
}

moved {
  from = aws_sesv2_email_identity.contact
  to   = module.sensatempo.aws_sesv2_email_identity.contact[0]
}

moved {
  from = aws_iam_role.contact
  to   = module.sensatempo.aws_iam_role.contact
}

moved {
  from = aws_iam_role_policy_attachment.contact_logs
  to   = module.sensatempo.aws_iam_role_policy_attachment.contact_logs
}

moved {
  from = aws_iam_role_policy.contact_send
  to   = module.sensatempo.aws_iam_role_policy.contact_send
}

moved {
  from = aws_cloudwatch_log_group.contact
  to   = module.sensatempo.aws_cloudwatch_log_group.contact
}

moved {
  from = aws_lambda_function.contact
  to   = module.sensatempo.aws_lambda_function.contact
}

moved {
  from = aws_lambda_function_url.contact
  to   = module.sensatempo.aws_lambda_function_url.contact
}

moved {
  from = aws_lambda_permission.contact_function_url_public
  to   = module.sensatempo.aws_lambda_permission.contact_function_url_public
}

moved {
  from = aws_cloudwatch_log_metric_filter.contact
  to   = module.sensatempo.aws_cloudwatch_log_metric_filter.contact
}

moved {
  from = aws_cloudwatch_metric_alarm.contact_failed
  to   = module.sensatempo.aws_cloudwatch_metric_alarm.contact_failed
}

moved {
  from = aws_cloudwatch_metric_alarm.contact_too_many
  to   = module.sensatempo.aws_cloudwatch_metric_alarm.contact_too_many
}
