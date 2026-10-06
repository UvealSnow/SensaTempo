# Multi-stage image: `live-preview` (Node + Lambda Web Adapter) and `prod-preview` (local static Nginx).
#
# AWS Lambda (container) pulls from ECR and expects a single-architecture image manifest.
# BuildKit provenance/SBOM attestations produce an OCI index Lambda rejects — disable them when
# building/pushing (see Makefile and .github/workflows/preview-deploy.yaml), not here.
#
# Preview Lambda in Terraform uses architectures = ["arm64"]; keep Node stages on linux/arm64 so
# native modules (e.g. sharp) match the runtime.

# Storyblok token comes from the DOTENV secret mount; never pass it as a build-arg (it would be baked into image history).
#
# Node is pinned to 24: newer Node releases no longer bundle corepack, which we use to get pnpm.

FROM --platform=linux/arm64 node:24-alpine3.23 AS build-base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# PROD build only generates the static HTML, this will be copies to S3 (TODO)
# this will be deployed to the main domain (sensatempo.mx)
FROM build-base AS build-prod

ARG PUBLIC_DEFAULT_LANGUAGE
ARG PUBLIC_AVAILABLE_LANGUAGES

ENV PUBLIC_DEFAULT_LANGUAGE=$PUBLIC_DEFAULT_LANGUAGE
ENV PUBLIC_AVAILABLE_LANGUAGES=$PUBLIC_AVAILABLE_LANGUAGES
ENV NODE_ENV=production
ENV PUBLIC_BUILD_TYPE=static

RUN --mount=type=secret,id=DOTENV \
    export $(grep -v '^#' /run/secrets/DOTENV | xargs) && \
    pnpm build


# Live preview will deploy the container to a cheap container service, it will be used
# through a sub-domain (preview.sensatempo.mx)
FROM build-base AS build-preview

ARG PUBLIC_DEFAULT_LANGUAGE
ARG PUBLIC_AVAILABLE_LANGUAGES

ENV PUBLIC_DEFAULT_LANGUAGE=$PUBLIC_DEFAULT_LANGUAGE
ENV PUBLIC_AVAILABLE_LANGUAGES=$PUBLIC_AVAILABLE_LANGUAGES
ENV NODE_ENV=production
ENV PUBLIC_BUILD_TYPE=server

RUN --mount=type=secret,id=DOTENV \
    export $(grep -v '^#' /run/secrets/DOTENV | xargs) && \
    pnpm build


# Runtime dependencies only: the server bundle still imports some packages from node_modules.
FROM --platform=linux/arm64 node:24-alpine3.23 AS prod-deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile


# Deployed to AWS Lambda (Function URL + Lambda Web Adapter).
FROM --platform=linux/arm64 node:24-alpine3.23 AS live-preview

WORKDIR /app

# This allows our little server to run in Lambda
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build-preview /app/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]


# Local static preview only (same platform as Makefile / CI for consistency).
FROM --platform=linux/arm64 nginxinc/nginx-unprivileged:1.27-alpine AS prod-preview

COPY nginx/local-prod-preview.conf /etc/nginx/conf.d/default.conf
COPY --from=build-prod /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
