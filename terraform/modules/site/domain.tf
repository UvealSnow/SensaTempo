# --- 7. CUSTOM DOMAIN: ACM CERTIFICATE + ROUTE 53 (only with var.domain) ---
# The certificate and its validation records are created right away, so it issues as soon as the
# zone's nameservers are live. attach_domain then waits for it and puts the domain on CloudFront.

locals {
  # Known at plan time, so they can key the validation records
  cert_domains = var.domain == null ? [] : [var.domain, "www.${var.domain}", "preview.${var.domain}"]
}

resource "aws_acm_certificate" "site" {
  count                     = var.domain == null ? 0 : 1
  domain_name               = var.domain
  subject_alternative_names = slice(local.cert_domains, 1, 3)
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.cert_domains)
  zone_id  = var.zone_id
  name = one([
    for option in aws_acm_certificate.site[0].domain_validation_options :
    option.resource_record_name if option.domain_name == each.key
  ])
  type = one([
    for option in aws_acm_certificate.site[0].domain_validation_options :
    option.resource_record_type if option.domain_name == each.key
  ])
  records = [one([
    for option in aws_acm_certificate.site[0].domain_validation_options :
    option.resource_record_value if option.domain_name == each.key
  ])]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count                   = local.attach_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

locals {
  # name in the zone → distribution
  domain_aliases = local.attach_domain ? {
    apex    = { name = var.domain, distribution = aws_cloudfront_distribution.prod_site }
    www     = { name = "www.${var.domain}", distribution = aws_cloudfront_distribution.prod_site }
    preview = { name = "preview.${var.domain}", distribution = aws_cloudfront_distribution.preview }
  } : {}
  domain_alias_records = merge([
    for key, alias in local.domain_aliases : {
      for type in ["A", "AAAA"] : "${key}-${type}" => merge(alias, { type = type })
    }
  ]...)
}

resource "aws_route53_record" "site" {
  for_each = local.domain_alias_records
  zone_id  = var.zone_id
  name     = each.value.name
  type     = each.value.type

  alias {
    name                   = each.value.distribution.domain_name
    zone_id                = each.value.distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# --- 8. SES DOMAIN IDENTITY (only with var.ses_domain) ---
# DKIM signs the contact form's mail; MAIL FROM (mail.<domain>) aligns SPF without touching the
# apex SPF record, which belongs to the mailbox provider.

resource "aws_sesv2_email_identity" "domain" {
  count          = local.ses_domain ? 1 : 0
  email_identity = var.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.ses_domain ? 3 : 0
  zone_id = var.zone_id
  name    = "${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 3600
  records = ["${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  count                  = local.ses_domain ? 1 : 0
  email_identity         = aws_sesv2_email_identity.domain[0].email_identity
  mail_from_domain       = "mail.${var.domain}"
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  count   = local.ses_domain ? 1 : 0
  zone_id = var.zone_id
  name    = "mail.${var.domain}"
  type    = "MX"
  ttl     = 3600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  count   = local.ses_domain ? 1 : 0
  zone_id = var.zone_id
  name    = "mail.${var.domain}"
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:amazonses.com ~all"]
}
