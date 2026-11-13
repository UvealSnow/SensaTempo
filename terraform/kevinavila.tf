# --- kevinavila.pro: Kevin's blog (theme "kevin") ---
# The domain stays registered at GoDaddy; its DNS moves to this zone (README "kevinavila.pro DNS").
# Mail stays on Zoho: the records below copy the GoDaddy zone (export of 2026-11-10).

resource "aws_route53_zone" "kevinavila" {
  name    = "kevinavila.pro"
  comment = "Kevin Avila blog; mail on Zoho"
}

resource "aws_route53_record" "kevinavila_mx" {
  zone_id = aws_route53_zone.kevinavila.zone_id
  name    = "kevinavila.pro"
  type    = "MX"
  ttl     = 3600
  records = ["10 mx.zoho.com", "20 mx2.zoho.com", "50 mx3.zoho.com"]
}

resource "aws_route53_record" "kevinavila_spf" {
  zone_id = aws_route53_zone.kevinavila.zone_id
  name    = "kevinavila.pro"
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:zohomail.com ~all"]
}

# Report-only to start; tighten to quarantine once Zoho and SES both pass DKIM
resource "aws_route53_record" "kevinavila_dmarc" {
  zone_id = aws_route53_zone.kevinavila.zone_id
  name    = "_dmarc.kevinavila.pro"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=none; rua=mailto:hola@kevinavila.pro"]
}

# Zoho Mail Admin → Domains → kevinavila.pro → Email Authentication → DKIM
resource "aws_route53_record" "kevinavila_zoho_dkim" {
  count   = var.kevinavila_zoho_dkim == null ? 0 : 1
  zone_id = aws_route53_zone.kevinavila.zone_id
  name    = "${var.kevinavila_zoho_dkim.selector}._domainkey.kevinavila.pro"
  type    = "TXT"
  ttl     = 3600
  # TXT strings are at most 255 characters; Route 53 joins quoted chunks
  records = [join("\"\"", regexall(".{1,255}", var.kevinavila_zoho_dkim.value))]
}

module "kevinavila" {
  source = "./modules/site"

  name              = "kevinavila"
  display_name      = "Kevin Avila"
  metric_namespace  = "KevinAvila"
  github_repository = var.github_repository
  contact_allowed_origins = [
    "https://kevinavila.pro",
    "https://preview.kevinavila.pro",
  ]

  domain        = "kevinavila.pro"
  zone_id       = aws_route53_zone.kevinavila.zone_id
  attach_domain = var.kevinavila_domain_live
  ses_domain    = true

  lambda_web_adapter_layer_version = var.lambda_web_adapter_layer_version
  origin_access_control_id         = aws_cloudfront_origin_access_control.default.id
  github_oidc_provider_arn         = aws_iam_openid_connect_provider.github.arn
  alerts_topic_arn                 = aws_sns_topic.alerts.arn
}
