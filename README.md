# Sensa Tempo - A minimal Photography Blog

Sensa Tempo is a minimal, fast, and SEO-friendly photography blog built with [Astro](https://astro.build) and [Storyblok](https://www.storyblok.com/) for content management. It showcases a photography portfolio with a clean layout, excellent performance, and SEO capabilities.

## 🛠 Stack

- **Astro 7**, **Tailwind 4**, **Vite 8** for fast builds and styling
- **@storyblok/astro 10** for headless CMS integration
- **@astrojs/node 11** for SSR
- **pnpm 10**, **Node 24**
- Static production builds or SSR preview builds (controlled via `PUBLIC_BUILD_TYPE` environment variable)

## 🚀 Project Structure

```text
├── public/
├── src/
│   ├── components/       Astro components
│   ├── layouts/          Page layouts
│   ├── loaders/          Storyblok content loaders
│   ├── middleware.ts     Basic auth for preview
│   ├── pages/            Route pages (dynamic language routing)
│   ├── storyblok/        Storyblok component definitions
│   └── styles/           Global styles
├── docker/               Production build Docker image
├── terraform/            AWS infrastructure as code
├── Makefile              Build and deployment helpers
└── scripts/              Packaging and utility scripts
```

Pages are in `src/pages/` and use dynamic routing with the `[lang]` parameter. Content is fetched from Storyblok via loaders in `src/loaders/`.

## 🧞 Commands

| Command             | Action                               |
| :------------------ | :----------------------------------- |
| `pnpm install`      | Install dependencies with pnpm 10    |
| `pnpm dev`          | Start dev server at `localhost:4321` |
| `pnpm build`        | Build production site to `./dist/`   |
| `pnpm preview`      | Preview built site locally           |
| `pnpm format`       | Format files with Prettier           |
| `pnpm format:check` | Check format compliance              |
| `pnpm lint`         | Lint with ESLint                     |
| `pnpm lint:fix`     | Fix auto-fixable lint issues         |
| `pnpm test`         | Run unit tests (`node --test`)       |

## 🛠 Development & Deployment

Everything runs on **AWS (us-east-1)** and is pay-per-use: nothing bills while the site has no visitors.

| Environment    | Hosting                                                                                    | Built by                                | Description                                                                                                                                                 |
| :------------- | :----------------------------------------------------------------------------------------- | :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production** | **S3 + CloudFront**                                                                        | `prod-deploy.yaml` on push to `main`    | Fully static build (published content). A CloudFront Function maps `/es/about/` to `index.html` and redirects `/` to `/es/` or `/en/` by `Accept-Language`. |
| **Preview**    | **Lambda** (zip, Node 24, arm64) + **Lambda Web Adapter** layer, behind its own CloudFront | `preview-deploy.yaml` on push to `main` | SSR build for Storyblok editors: draft content fetched per request, Visual Editor bridge, HTTP Basic Auth (`src/middleware.ts`).                            |
| **Local QA**   | **Nginx** in Docker                                                                        | `make run-prod-preview`                 | Serves the static production build on http://localhost:8080.                                                                                                |

**Temporary URLs** (no custom domain yet):

- Production: https://d1fr6xerqueq2v.cloudfront.net
- Preview: https://d22dvpdtgdplg6.cloudfront.net/ (basic auth; Storyblok preview URL: `https://d22dvpdtgdplg6.cloudfront.net/es/`)

**Deploying any branch:** Actions → _Deploy branch_ → _Run workflow_. Keep "Use workflow from" on `main` (the AWS role only trusts `main`), enter the branch, tag or SHA in **ref** and pick **target** (`preview`, `production` or `both`). The deploy stays until the next one; any push to `main` redeploys `main`. Production publishes what it's serving at `/version.json`; to roll back, run it again with `ref=main`.

**Publishing content rebuilds production:** a Storyblok webhook (story published, unpublished, deleted or moved; datasource entries saved or deleted) calls the `sensatempo-storyblok-webhook` Lambda (`terraform/webhook/index.mjs`). It requires the webhook secret, either as the `webhook-signature` header (HMAC-SHA1 of the body; paid Storyblok plans) or as `?key=<secret>` in the URL (the free plan has no secret field), and sends a `storyblok-publish` `repository_dispatch` to GitHub, which runs `prod-deploy.yaml` on `main` (~1–2 min). Bursts queue into at most one extra build. This replaces any branch deployed to production. `/version.json` shows the `trigger` (`push`, `dispatch` or `storyblok:<action> <full_slug>`). Storyblok setup: Settings → Webhooks, URL = Terraform output `storyblok_webhook_url` + `?key=<secret>` (secret = `/sensatempo/storyblok/webhook-secret`); on a paid plan put the secret in the secret field instead.

---

### 📋 Prerequisites

- **pnpm 10** and **Node 24**
- **GNU Make**, **AWS CLI** and **Terraform ≥ 1.10** for infrastructure work
- **Docker** (BuildKit) only for `make run-prod-preview`
- A local `.env` file (see `.env.example`) containing:
  - `STORYBLOK_PUBLIC_TOKEN` (published content, production builds)
  - `STORYBLOK_PREVIEW_TOKEN` (draft content, `pnpm dev` and the SSR preview)
  - `PUBLIC_DEFAULT_LANGUAGE` (default: es)
  - `PUBLIC_AVAILABLE_LANGUAGES` (default: es,en)

---

### 🚀 Makefile targets

| Target                  | Action                                                                                             |
| :---------------------- | :------------------------------------------------------------------------------------------------- |
| `make run-preview`      | Build the SSR preview and run it locally on **http://localhost:8080** (what the Lambda runs).      |
| `make package-preview`  | Build the SSR preview and zip it for Lambda (`preview-lambda.zip`, linux-arm64 runtime deps only). |
| `make deploy-preview`   | Package and upload the preview to the `sensatempo-preview-ssr` Lambda from your machine.           |
| `make build-prod`       | Build the static production site in Docker (`.env` mounted as a build secret).                     |
| `make run-prod-preview` | Build the static site and serve it with **Nginx** on **http://localhost:8080**.                    |
| `make clean`            | Remove the local Docker image and preview zip.                                                     |

---

### 🔒 Secrets

Secrets live in **AWS SSM Parameter Store** as `SecureString`s (free standard tier, AWS-managed `aws/ssm` key). Nothing secret is stored in GitHub or in the repo.

| Parameter                                 | Used by                                                                                             |
| :---------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `/sensatempo/storyblok/public-token`      | Production build in CI (read via the GitHub OIDC deploy role)                                       |
| `/sensatempo/storyblok/preview-token`     | Preview build in CI, and the preview Lambda at runtime (draft fetches, Visual Editor auth)          |
| `/sensatempo/preview/basic-auth-user`     | Preview Lambda basic auth (read by Terraform into the Lambda env)                                   |
| `/sensatempo/preview/basic-auth-password` | Preview Lambda basic auth                                                                           |
| `/sensatempo/storyblok/webhook-secret`    | Publish webhook Lambda (signature or `?key=` check); the same value goes in Storyblok's webhook URL |
| `/sensatempo/github/dispatch-token`       | Publish webhook Lambda, to call GitHub's `repository_dispatch` API                                  |

**Dispatch token:** a fine-grained GitHub PAT limited to this repository with only `Contents: read & write` (what `repository_dispatch` needs). Fine-grained PATs expire after at most 1 year: note the expiry date, then rotate by creating a new token, updating the parameter and running `pnpm tf:apply`. Until then publishes fail with 502 in Storyblok's webhook log.

Create or rotate a value (Terraform only reads these, so values never appear in code):

```bash
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite \
  --name /sensatempo/storyblok/preview-token --value '<token>'
```

After rotating the preview token, the basic auth values or the webhook parameters, run `pnpm tf:apply` to push them to the Lambda. Locally, builds read the tokens from `.env`.

**Storyblok Visual Editor:** the preview loads the Storyblok bridge (static builds don't). The editor iframe can't answer the basic auth prompt, so `src/middleware.ts` also lets in requests carrying a valid `_storyblok_tk` (sha1 of `space_id:preview_token:timestamp`, at most 1 hour old) and swaps it for a signed 8-hour session cookie (`SameSite=None; Partitioned`), so links clicked inside the editor keep working. In Storyblok, set the preview URL to `<preview_url>/es/` (the CloudFront one: Function URLs reject the editor's `_storyblok_tk[...]` query keys, so a CloudFront Function percent-encodes them) and the `home` story's real path to `/`.

**GitHub repository variables** (not secret): `AWS_DEPLOY_ROLE_ARN`, `AWS_PROD_BUCKET`, `AWS_CF_DIST_ID` (from the Terraform outputs), `PUBLIC_DEFAULT_LANGUAGE`, `PUBLIC_AVAILABLE_LANGUAGES`.

---

### ☁️ Terraform (AWS)

Infrastructure lives under **`terraform/`**. State is stored remotely in the `sensatempo-tfstate-221135164152` S3 bucket (versioned, S3-native locking). That bucket was created once by hand, as were the SSM parameters above.

| Area           | Resources                                                                                                                                                                                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production** | Private S3 bucket, CloudFront distribution (Origin Access Control, managed caching policy, `PriceClass_100`), CloudFront Function for index rewrites.                                                           |
| **Preview**    | Lambda function (zip, `nodejs24.x`, arm64, Lambda Web Adapter layer), Function URL, CloudFront distribution in front (no caching), IAM role, CloudWatch log group (14-day retention).                           |
| **Webhook**    | `sensatempo-storyblok-webhook` Lambda (Node 24, arm64, 128 MB, max 2 concurrent), public Function URL, IAM role (logs only), CloudWatch log group (14-day retention).                                           |
| **CI**         | GitHub OIDC provider and the `sensatempo-github-deploy` role. Only workflows on `main` can assume it; it can read `/sensatempo/storyblok/*`, sync the bucket, invalidate CloudFront and update the Lambda code. |

```bash
pnpm tf:init
pnpm tf:plan
pnpm tf:apply
```

**Outputs:** `cloudfront_domain`, `cloudfront_distribution_id`, `prod_bucket`, `preview_url`, `preview_lambda_url`, `github_deploy_role_arn`, `storyblok_webhook_url`.

Terraform creates the Lambda with placeholder code and ignores code changes afterwards. Real code is deployed by CI or `make deploy-preview`, so `terraform apply` never rolls it back.
