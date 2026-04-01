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
├── astro.config.mjs
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

### 🚀 Essential Commands

| Command | Action |
| :--- | :--- |
| `make build-prod` | Builds the static production image using `.env` secrets. |
| `make build-preview` | Builds the ARM64 container for AWS Lambda deployment. |
| `make run-prod-preview` | Launches the production build in a local Nginx container at `http://localhost:8080`. |
| `make clean` | Removes local build images and temporary docker artifacts. |

---

### 🔒 Security & Environment Variables

We prioritize security by ensuring sensitive tokens are never "baked" into Docker image layers.

1. **Build-time Secrets:** For the static production build, the `STORYBLOK_ACCESS_TOKEN` is mounted temporarily using `--mount=type=secret`. It is available during `pnpm build` but does not exist in the final image.
2. **Runtime Variables:** For the Preview SSR environment, variables are injected by the host (AWS Lambda) at runtime.
3. **CI/CD:** GitHub Actions uses Open
