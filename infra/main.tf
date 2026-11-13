# The docs site at caelus.ufosoft.dev: a private S3 bucket behind CloudFront, its certificate, its
# records in the ufosoft.dev zone, and the role the release workflow will deploy with. Applied by
# hand; CI only syncs files and invalidates. Adapted from ufosoft-website/infra.

terraform {
  required_version = ">= 1.10"

  # The website's state bucket, under this stack's own key. use_lockfile holds the lock in S3.
  backend "s3" {
    bucket       = "ufosoft-web-tfstate"
    key          = "caelus/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# One region: CloudFront reads its certificate from us-east-1, and the bucket sits beside it.
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "caelus-site"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  domain = "caelus.ufosoft.dev"
  zone   = "ufosoft.dev"

  # Bucket names are global, so this one carries the account ID.
  bucket = "caelus-site-${data.aws_caller_identity.current.account_id}"

  # GitHub issues ID-augmented OIDC claims: the subject names the owner and repository with their
  # IDs (gh api repos/ufo-soft/caelus). IAM refuses a job_workflow_ref pattern that starts with a
  # wildcard, so that one anchors on the names and matches with or without the IDs.
  oidc_repository = "ufo-soft@174381133/caelus@1314536027"
  oidc_workflow   = "ufo-soft*/caelus*"
}

# ---- Bucket ----
# Private. Only this distribution can read it, through the origin access control.

resource "aws_s3_bucket" "site" {
  bucket = local.bucket
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "site" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json
}

# ---- Certificate ----
# ACM resolves the validation records itself; the distribution waits for issuance.

resource "aws_acm_certificate" "site" {
  domain_name       = local.domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for option in aws_acm_certificate.site.domain_validation_options : option.domain_name => option
  }

  zone_id = data.aws_route53_zone.site.zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  ttl     = 60
  records = [each.value.resource_record_value]
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# ---- Distribution ----

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = local.bucket
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = local.domain
  default_root_object = "index.html"
  aliases             = [local.domain]
  price_class         = "PriceClass_100"

  origin {
    origin_id                = "s3-site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
  }

  # A private bucket answers a missing key with 403, not 404. Both get VitePress's 404 page.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ---- DNS ----
# The ufosoft.dev zone belongs to starman-source's Terraform; this stack only adds its records.

data "aws_route53_zone" "site" {
  name = local.zone
}

resource "aws_route53_record" "site" {
  for_each = toset(["A", "AAAA"])

  zone_id = data.aws_route53_zone.site.zone_id
  name    = local.domain
  type    = each.key

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# ---- Release role ----
# Assumed by the release workflow on a v* tag. It can write the bucket and invalidate the
# distribution, nothing else: the stack itself is applied by hand. The account has one GitHub OIDC
# provider, created by the website's stack, so this looks it up rather than creating another.

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "release_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.oidc_repository}:ref:refs/tags/v*"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:job_workflow_ref"
      values   = ["${local.oidc_workflow}/.github/workflows/release.yml@refs/tags/v*"]
    }
  }
}

resource "aws_iam_role" "release" {
  name               = "caelus-site-release"
  description        = "Assumed by caelus's release workflow to publish the docs site."
  assume_role_policy = data.aws_iam_policy_document.release_assume.json
}

data "aws_iam_policy_document" "release" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "release" {
  name   = "caelus-site-release"
  role   = aws_iam_role.release.id
  policy = data.aws_iam_policy_document.release.json
}

# ---- Outputs ----
# The release workflow reads the first three as repository variables.

output "site_bucket" {
  value = aws_s3_bucket.site.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "release_role_arn" {
  value = aws_iam_role.release.arn
}

output "site_url" {
  value = "https://${local.domain}/"
}
