# Sensa Tempo - A minimal Photography Blog

Sensa Tempo is a minimal, fast, and SEO-friendly photography blog template built with [Astro](https://astro.build). It is designed to showcase your photography portfolio with a clean and simple layout, while providing excellent performance and SEO capabilities.

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   ├── loaders/
│   ├── pages/
│   ├── storyblok/
│   └── styles/
├── docker/
├── terraform/
├── astro.config.mjs
├── Makefile
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

This template is meant to be used with [storyblok](https://www.storyblok.com/) for content management, the `src/storyblok` folder contains Storyblok components that can be used in Storyblok's visual editor. Content collections are pulled by the `src/loaders/` directory, which contains loaders for fetching data from Storyblok.

There's nothing special about `src/components/`, but that's where we keep any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, icons and fonts can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm i`               | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm format`          | Format all files with Prettier                   |
| `pnpm format:check`    | Check if files are properly formatted            |
| `pnpm lint`            | Check for linting issues with ESLint             |
| `pnpm lint:fix`        | Fix auto-fixable linting issues                  |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 🎨 Code Formatting & Linting

This project uses **Prettier** for code formatting and **ESLint** for code linting to ensure consistent code quality and style.

### Prettier Setup

Prettier is configured with the latest stable configuration for automatic code formatting.

**Features:**

- ✅ Prettier 3.6.2 installed
- ✅ Astro support with `prettier-plugin-astro`
- ✅ ESLint integration with `eslint-config-prettier`
- ✅ VS Code integration configured
- ✅ Format on save enabled

**Scripts:**

```bash
# Format all files
pnpm format

# Check if files are formatted
pnpm format:check
```

**Prettier Rules:**

- Semi-colons: enabled
- Single quotes: enabled
- Trailing commas: ES5 compatible
- Print width: 80 characters
- Tab width: 2 spaces
- End of line: LF (Unix)
- Astro file support enabled

### ESLint Setup

ESLint is configured with TypeScript and Astro support to catch potential issues and enforce coding standards.

**Features:**

- ✅ Modern flat config format
- ✅ TypeScript support with `@typescript-eslint`
- ✅ Astro file support with `eslint-plugin-astro`
- ✅ Prettier compatibility (no formatting conflicts)
- ✅ Browser and Node.js globals configured

**Scripts:**

```bash
# Check for linting issues
pnpm lint

# Fix auto-fixable linting issues
pnpm lint:fix
```

**ESLint Rules Enabled:**

- JavaScript/TypeScript recommended rules
- No unused variables (with underscore prefix exception)
- No console warnings, debugger errors
- Prefer modern syntax (const, template literals, etc.)
- Astro-specific rules for component best practices

### VS Code Integration

For the best development experience:

1. **Install recommended extensions** (VS Code will prompt you):
   - `astro-build.astro-vscode` - Astro language support
   - `esbenp.prettier-vscode` - Prettier formatter
   - `dbaeumer.vscode-eslint` - ESLint integration
   - `bradlc.vscode-tailwindcss` - Tailwind CSS support

2. **Automatic formatting and linting:**
   - Code formats automatically on save
   - ESLint issues are highlighted in real-time
   - Both tools work together without conflicts

### Configuration Files

- `.prettierrc` - Prettier configuration
- `.prettierignore` - Files to exclude from formatting
- `eslint.config.js` - ESLint flat configuration
- `.vscode/settings.json` - VS Code workspace settings
- `.vscode/extensions.json` - Recommended extensions

## 🛠 Development & Deployment

Everything runs on **AWS (`us-east-1`)** and is pay-per-use: nothing bills while the site has no visitors.

| Environment    | Hosting                                                                              | Built by                                | Description                                                                                                                                |
| :------------- | :----------------------------------------------------------------------------------- | :-------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Production** | **S3 + CloudFront**                                                                  | `prod-deploy.yaml` on push to `main`    | Fully static build (published content). A CloudFront Function maps `/es/about/` to `index.html` and redirects `/` to the default language. |
| **Preview**    | **Lambda** (zip, Node 24, arm64) + **Lambda Web Adapter** layer, public Function URL | `preview-deploy.yaml` on push to `main` | SSR build for Storyblok editors, protected by HTTP Basic Auth (`src/middleware.ts`).                                                       |
| **Local QA**   | **Nginx** in Docker                                                                  | `make run-prod-preview`                 | Serves the static production build on http://localhost:8080.                                                                               |

**Deploying a branch to the preview:** Actions → _Preview Deployment_ → _Run workflow_, keep "Use workflow from" on `main` and enter the branch in **ref**. It replaces the shared preview until the next deploy (any push to `main` redeploys `main`).

---

### 📋 Prerequisites

- **pnpm** and **Node 24**
- **GNU Make**, **AWS CLI** and **Terraform ≥ 1.10** for infrastructure work
- **Docker** (BuildKit) only for `make run-prod-preview`
- A local `.env` file (see `.env.example`) containing:
  - `STORYBLOK_ACCESS_TOKEN`
  - `PUBLIC_DEFAULT_LANGUAGE`
  - `PUBLIC_AVAILABLE_LANGUAGES`

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

| Parameter                                 | Used by                                                           |
| :---------------------------------------- | :---------------------------------------------------------------- |
| `/sensatempo/storyblok/access-token`      | CI builds (read via the GitHub OIDC deploy role)                  |
| `/sensatempo/preview/basic-auth-user`     | Preview Lambda basic auth (read by Terraform into the Lambda env) |
| `/sensatempo/preview/basic-auth-password` | Preview Lambda basic auth                                         |

Create or rotate a value (Terraform only reads these, so values never appear in code):

```bash
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite \
  --name /sensatempo/storyblok/access-token --value '<token>'
```

After rotating the basic auth values, run `pnpm tf:apply` to push them to the Lambda. Locally, builds read the token from `.env`.

**GitHub repository variables** (not secret): `AWS_DEPLOY_ROLE_ARN`, `AWS_PROD_BUCKET`, `AWS_CF_DIST_ID` (from the Terraform outputs), `PUBLIC_DEFAULT_LANGUAGE`, `PUBLIC_AVAILABLE_LANGUAGES`.

---

### ☁️ Terraform (AWS)

Infrastructure lives under **`terraform/`**. State is stored remotely in the `sensatempo-tfstate-221135164152` S3 bucket (versioned, S3-native locking). That bucket was created once by hand, as were the SSM parameters above.

| Area           | Resources                                                                                                                                                                                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production** | Private S3 bucket, CloudFront distribution (Origin Access Control, managed caching policy, `PriceClass_100`), CloudFront Function for index rewrites.                                                           |
| **Preview**    | Lambda function (zip, `nodejs24.x`, arm64, Lambda Web Adapter layer), Function URL, IAM role, CloudWatch log group (14-day retention).                                                                          |
| **CI**         | GitHub OIDC provider and the `sensatempo-github-deploy` role. Only workflows on `main` can assume it; it can read `/sensatempo/storyblok/*`, sync the bucket, invalidate CloudFront and update the Lambda code. |

```bash
pnpm tf:init
pnpm tf:plan
pnpm tf:apply
```

**Outputs:** `cloudfront_domain`, `cloudfront_distribution_id`, `prod_bucket`, `preview_lambda_url`, `github_deploy_role_arn`.

Terraform creates the Lambda with placeholder code and ignores code changes afterwards. Real code is deployed by CI or `make deploy-preview`, so `terraform apply` never rolls it back.
