# infra

The docs site at https://caelus.ufosoft.dev: a private S3 bucket behind CloudFront, its ACM
certificate, A/AAAA records in the `ufosoft.dev` zone, and the role the release workflow deploys
with. Everything is in `main.tf`.

It lives in the same AWS account as ufosoft-website and leans on two things there: the `ufosoft.dev`
hosted zone (owned by starman-source's Terraform) and the GitHub OIDC provider (created by the
website's stack). State sits in the website's state bucket under `caelus/terraform.tfstate`.

## Applying

By hand, with credentials for that account. CI never applies; its role can only sync the bucket and
invalidate the distribution.

```sh
cd infra
terraform init
terraform plan
terraform apply
```

The first apply waits for the certificate to be issued, which takes a few minutes. Commit
`.terraform.lock.hcl` when `init` changes it.

## Uploading a build by hand

```sh
npm run build -w site
aws s3 sync site/.vitepress/dist "s3://$(terraform -chdir=infra output -raw site_bucket)/" --delete
aws cloudfront create-invalidation --paths '/*' \
  --distribution-id "$(terraform -chdir=infra output -raw distribution_id)"
```
