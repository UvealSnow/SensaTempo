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

## 🛠 Development & Build Process

This project uses a **multi-stage Docker architecture** managed via a `Makefile` to handle both static production builds and SSR preview environments.

---

### 📋 Prerequisites
* **Docker** (with BuildKit enabled)
* **pnpm** (for local dependency management)
* **GNU Make**
* A local `.env` file (see `.env.example`) containing:
    * `STORYBLOK_ACCESS_TOKEN`
    * `PUBLIC_DEFAULT_LANGUAGE`
    * `PUBLIC_AVAILABLE_LANGUAGES`

---

### 🏗 Environment Strategy

| Environment | Target | Delivery | Description |
| :--- | :--- | :--- | :--- |
| **Production** | `build-prod` | **S3 + CloudFront** | Fully static build. API keys are used only during build-time via Docker Secret Mounts. |
| **Preview** | `live-preview` | **Lambda + Adapter** | SSR container running with the AWS Lambda Web Adapter. Uses runtime env vars. |
| **Local QA** | `prod-preview` | **Nginx** | A local Nginx container serving the static production build for final validation. |

---

### 🚀 Makefile targets

All image builds use `./docker/Dockerfile`, **linux/arm64**, and BuildKit **without** provenance/SBOM attestations (Lambda-compatible single-arch manifests). The production and preview build paths mount your repo **`.env`** as a secret (`DOTENV`) so `STORYBLOK_ACCESS_TOKEN` and other values are available during `pnpm build` without ending up in image layers.

**Optional Make variables:** `AWS_REGION` (default `us-east-1`), `AWS_ACCOUNT_ID` (default from `aws sts get-caller-identity`). `PUBLIC_DEFAULT_LANGUAGE` and `PUBLIC_AVAILABLE_LANGUAGES` are read from `.env` when invoking Make.

| Target | Action |
| :--- | :--- |
| `make build-prod` | Build the static production stage (`build-prod`); tags `sensatempo-prod:latest`. |
| `make build-preview` | Build the SSR Lambda preview image (`live-preview`); tags `sensatempo-preview:latest`. |
| `make run-preview` | Build the preview image (if needed) and run it locally on **http://localhost:8080**. |
| `make run-prod-preview` | Build the static site, then run it in a local **Nginx** container on **http://localhost:8080** (`prod-preview` stage). |
| `make push-preview-image` | Build the preview image, tag it for **ECR** (`<account>.dkr.ecr.<region>.amazonaws.com/sensatempo-preview:latest`), log in with the AWS CLI, and push. Requires AWS credentials and ECR permissions. |
| `make clean` | Remove local `sensatempo-prod:latest` and `sensatempo-preview:latest` images (ignores errors if missing). |

---

### 🔒 Security & Environment Variables

We prioritize security by ensuring sensitive tokens are never "baked" into Docker image layers.

1. **Build-time secrets:** For local Make builds, `.env` is mounted with `--mount=type=secret` during `pnpm build` and is not copied into the final image.
2. **Runtime variables:** The preview SSR container expects variables from the host (for example **AWS Lambda** environment variables set in Terraform).
3. **CI/CD:** The production workflow builds the static image with GitHub **Actions secrets** (for example `STORYBLOK_ACCESS_TOKEN`), copies `./dist` out of the container, syncs to **S3**, and creates a **CloudFront** invalidation using repository secrets for AWS credentials and resource IDs.

---

### ☁️ Terraform (AWS)

Infrastructure lives under **`terraform/`**. It targets **AWS** in **`us-east-1`** (see `provider "aws"` in `main.tf`). Requires **Terraform ≥ 1.5** and the **hashicorp/aws** provider (~> 5.x).

**What it manages**

| Area | Resources (summary) |
| :--- | :--- |
| **Production (static)** | Private S3 bucket for assets, **CloudFront** distribution with **Origin Access Control** (OAC), bucket policy allowing only that distribution to read objects. |
| **Preview (SSR)** | **ECR** repository `sensatempo-preview`, **Lambda** function (container image, **arm64**) with the **Lambda Web Adapter** port env vars, **function URL** (public invoke), IAM role and **public invoke permission** for the URL. |

**Variables** (`variables.tf`)

- `preview_basic_auth_user` / `preview_basic_auth_password` — optional HTTP Basic Auth for the preview Lambda. Empty strings disable auth. Marked sensitive; pass them with a **`-var-file`** (for example `secret.tfvars`) that you **do not commit**.

Example (after `cd terraform`):

```bash
terraform init
terraform plan -var-file=secret.tfvars
terraform apply -var-file=secret.tfvars
```

**Outputs:** `cloudfront_domain`, `preview_lambda_url`, `ecr_repository_url`.

**Deploying new preview images:** CI/CD can push a new image to ECR and update the Lambda image URI. The Lambda resource uses `lifecycle { ignore_changes = [image_uri] }` so routine **`terraform apply`** does not revert the image to Terraform’s placeholder while still allowing first-time provisioning.

**State:** Keep `terraform.tfstate` (and any backups) secure and preferably remote (for example S3 backend); the repo layout is suitable for local runs only if that matches your team’s process.
