# Sensa Tempo - A minimal Photography Blog

Sensa Tempo is a minimal, fast, and SEO-friendly photography blog built with [Astro](https://astro.build) and [Storyblok](https://www.storyblok.com/) for content management. It showcases a photography portfolio with a clean layout, excellent performance, and SEO capabilities.

## 🛠 Stack

- **Astro 7**, **Tailwind 4**, **Vite 8** for fast builds and styling
- **@storyblok/astro 10** for headless CMS integration
- **@astrojs/node 11** for SSR
- **pnpm 12**, **Node 24**
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

**Blog:** posts are `post` stories in the Storyblok `blog/post/` folder; `postPath` (`src/utils/posts.ts`) builds every post link.

| URL                                    | Page          | Status |
| :------------------------------------- | :------------ | :----- |
| `/{lang}/blog/`                        | Blog index    | ✅     |
| `/{lang}/blog/{n}/`                    | Index page n  | ✅     |
| `/{lang}/blog/archive/{YYYY}/{MM}/{n}` | Month archive | ✅     |
| `/{lang}/blog/author/{slug}/{n}`       | Author index  | ✅     |
| `/{lang}/blog/tag/{slug}/{n}`          | Tag index     | ✅     |
| `/{lang}/blog/post/{slug}/`            | Post          | ✅     |

**Blog content model** (Storyblok, `src/content.config.ts`):

- `post` (`blog/post/`): `title`, `excerpt` (the card brief), `cover` + `cover_description` / `cover_taken_at` (shown over the image), `published_at` (order and archive month; empty = first publish), `author`, `tags`, `body`.
- `author` (`blog/author/`): `name`, `bio`, `photo`, `socials` (`social_link`: `icon` + `url`). `tag` (`blog/tag/`): `name`, `description`.
- `blog_index` (the `blog/` start page): title, description, `featured` posts (sidebar), `quick_link_tags` and UI strings (built-in fallbacks in `src/utils/blog.ts`).
- Posts reference authors, tags and featured posts by uuid; `src/utils/posts.ts` and `src/utils/blog.ts` join them in code (no `resolve_relations`). The `picture` block has `description` + `taken_at`.

**Blog index** (`src/pages/[lang]/blog/[...page].astro`, `src/components/blog/`): post cards newest first, 10 per page. Featured posts are left out of the `/blog` cards (they only show in the sidebar). `/blog/1/` renders page 1 with a canonical to `/blog/`; a page past the end doesn't exist (404). The paginator is hidden with one page. **Month archives** (`src/pages/[lang]/blog/archive/[year]/[month]/[...page].astro`) exist for every month with posts in that language (UTC months, featured posts included), with the same pagination and canonical rules; title and description come from `archive_title` / `archive_description` (`{month}`, `{year}`).

**Author and tag pages** (`src/pages/[lang]/blog/author/[author]/`, `…/tag/[tag]/`) list that author's or tag's posts (featured included) with the same pagination; the header comes from the `author` story (name, bio, photo, social links) or the `tag` story (name, description). Every author and tag gets a page, even without posts (`empty_label` message).

The sidebar (`BlogSidebar`) shows on every index page: **Quick links** ("All posts" + up to 4 tags picked in `quick_link_tags`), **Featured posts** (the story's `featured` list, in the editor's order; scrolls past ~5) and the **Archive** (years → months with post counts in that language). On desktop it's sticky with sections open; on small screens it's below the cards with sections collapsed (`<details>`, so it works without JS). Card and picture images show their description and date taken over the image on hover or focus (always on touch screens).

**About and other pages** (`src/pages/[lang]/[slug].astro`): `page` stories. A page with a `title` gets the post header (`cover`, `cover_description`, `cover_taken_at`, title; `excerpt` is the meta description), so `about` is edited like a post; pages without one (home) are just their blocks.

**Projects** (`src/pages/[lang]/projects/`): `project` stories in the Storyblok `projects/` folder (`title`, `excerpt`, `cover` fields as in posts, `year`, `body` of `picture` / `text`), one page each at `/{lang}/projects/{slug}/`. `/{lang}/projects/` lists them as cards, newest `year` first, no pagination; title, description and UI strings come from the folder's start page (`projects_index`, fallbacks in `src/utils/projects.ts`).

**404 page:** `src/pages/404.astro`, text from the `layout/not-found` story (`NotFound`; built-in fallback strings if it's missing). Production builds one `404.html` with every language, which CloudFront serves for missing paths (S3 403/404 → 404); a blocking inline script shows the language from the URL prefix, else the browser's (`src/utils/language.ts`, same rule as the `/` redirect), and English without JS. The preview server renders only that language, from the URL or `Accept-Language`.

## 🧞 Commands

| Command             | Action                               |
| :------------------ | :----------------------------------- |
| `pnpm install`      | Install dependencies with pnpm 12    |
| `pnpm dev`          | Start dev server at `localhost:4321` |
| `pnpm build`        | Build production site to `./dist/`   |
| `pnpm preview`      | Preview built site locally           |
| `pnpm format`       | Format files with Prettier           |
| `pnpm format:check` | Check format compliance              |
| `pnpm lint`         | Lint with ESLint                     |
| `pnpm lint:fix`     | Fix auto-fixable lint issues         |
| `pnpm test`         | Run unit tests (`node --test`)       |
| `pnpm check:links`  | Find broken internal links in `dist` |

**Dependency release age:** pnpm 12 rejects package versions published less than 24 h ago (`minimumReleaseAge`). After a dependency release, wait a day before upgrading; for an urgent fix, temporarily add the package to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` and remove it afterwards. Build scripts only run for packages listed as `true` under `allowBuilds` there.

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

**Publishing content rebuilds production:** a Storyblok webhook (story published, unpublished, deleted or moved; datasource entries saved or deleted) calls the `sensatempo-storyblok-webhook` Lambda (`terraform/webhook/index.mjs`). It requires the webhook secret, either as the `webhook-signature` header (HMAC-SHA1 of the body; paid Storyblok plans) or as `?key=<secret>` in the URL (the free plan has no secret field), and sends a `storyblok-publish` `repository_dispatch` to GitHub, which runs `prod-deploy.yaml` on `main` (~1–2 min). Bursts queue into at most one extra build. After the build, `pnpm check:links` reports broken internal links as warnings (it doesn't block the deploy). This replaces any branch deployed to production. `/version.json` shows the `trigger` (`push`, `dispatch` or `storyblok:<action> <full_slug>`). Storyblok setup: Settings → Webhooks, URL = Terraform output `storyblok_webhook_url` + `?key=<secret>` (secret = `/sensatempo/storyblok/webhook-secret`); on a paid plan put the secret in the secret field instead.

---

### 📋 Prerequisites

- **pnpm 12** (pinned via `packageManager` in `package.json`; `corepack enable` picks it up) and **Node 24**
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
| `/sensatempo/alerts/email`                | Alert recipient (`String`, not secret; kept out of this public repo)                                |

**Dispatch token:** a fine-grained GitHub PAT limited to this repository with only `Contents: read & write` (what `repository_dispatch` needs). Fine-grained PATs expire after at most 1 year: note the expiry date, then rotate by creating a new token, updating the parameter and running `pnpm tf:apply`. Until then publishes fail with 502 in Storyblok's webhook log.

Create or rotate a value (Terraform only reads these, so values never appear in code):

```bash
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite \
  --name /sensatempo/storyblok/preview-token --value '<token>'
```

After rotating the preview token, the basic auth values or the webhook parameters, run `pnpm tf:apply` to push them to the Lambda. Locally, builds read the tokens from `.env`.

**Storyblok Visual Editor:** the preview loads the Storyblok bridge (static builds don't). The editor iframe can't answer the basic auth prompt, so `src/middleware.ts` also lets in requests carrying a valid `_storyblok_tk` (sha1 of `space_id:preview_token:timestamp`, at most 1 hour old) and swaps it for a signed 8-hour session cookie (`SameSite=None; Partitioned`), so links clicked inside the editor keep working. In Storyblok, set the preview URL to `<preview_url>/es/` (the CloudFront one: Function URLs reject the editor's `_storyblok_tk[...]` query keys, so a CloudFront Function percent-encodes them) and the `home` story's real path to `/`.

**GitHub repository variables** (not secret): `AWS_DEPLOY_ROLE_ARN`, `AWS_PROD_BUCKET`, `AWS_CF_DIST_ID` (from the Terraform outputs), `PUBLIC_DEFAULT_LANGUAGE`, `PUBLIC_AVAILABLE_LANGUAGES`, `PUBLIC_CF_ANALYTICS_TOKEN`.

**Analytics:** [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) (cookieless page views, referrers, countries, Core Web Vitals; no consent banner, no custom events). `src/components/layout/Analytics.astro` adds the beacon to production builds only, when `PUBLIC_CF_ANALYTICS_TOKEN` is set; the preview and `pnpm dev` never load it.

---

### ☁️ Terraform (AWS)

Infrastructure lives under **`terraform/`**. State is stored remotely in the `sensatempo-tfstate-221135164152` S3 bucket (versioned, S3-native locking). That bucket was created once by hand, as were the SSM parameters above.

| Area           | Resources                                                                                                                                                                                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production** | Private S3 bucket, CloudFront distribution (Origin Access Control, managed caching policy, `PriceClass_100`, `/404.html` error page), CloudFront Function for index rewrites.                                   |
| **Preview**    | Lambda function (zip, `nodejs24.x`, arm64, Lambda Web Adapter layer), Function URL, CloudFront distribution in front (no caching), IAM role, CloudWatch log group (14-day retention).                           |
| **Webhook**    | `sensatempo-storyblok-webhook` Lambda (Node 24, arm64, 128 MB, max 2 concurrent), public Function URL, IAM role (logs only), CloudWatch log group (14-day retention).                                           |
| **CI**         | GitHub OIDC provider and the `sensatempo-github-deploy` role. Only workflows on `main` can assume it; it can read `/sensatempo/storyblok/*`, sync the bucket, invalidate CloudFront and update the Lambda code. |

```bash
pnpm tf:init
pnpm tf:plan
pnpm tf:apply
```

**Alerts** (email via SNS topic `sensatempo-alerts`; confirm the subscription email once):

- `sensatempo-webhook-too-many-rebuilds`: > 30 webhook-triggered rebuilds in 1 hour
- `sensatempo-webhook-unauthorized`: > 50 rejected (401) webhook calls in 5 minutes
- `sensatempo-webhook-failed`: any failed dispatch to GitHub (usually an expired dispatch token)
- Budget `sensatempo-monthly`: forecast or actual account spend over $5/month

**Outputs:** `cloudfront_domain`, `cloudfront_distribution_id`, `prod_bucket`, `preview_url`, `preview_lambda_url`, `github_deploy_role_arn`, `storyblok_webhook_url`.

Terraform creates the Lambda with placeholder code and ignores code changes afterwards. Real code is deployed by CI or `make deploy-preview`, so `terraform apply` never rolls it back.
