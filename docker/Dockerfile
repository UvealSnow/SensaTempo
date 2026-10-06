# Local-only image: builds the static production site and serves it with Nginx (`make run-prod-preview`).
# Deployments don't use Docker: CI builds on the runner (prod -> S3, preview -> Lambda zip).

# Storyblok token comes from the DOTENV secret mount; never pass it as a build-arg (it would be baked into image history).
#
# Node is pinned to 24: newer Node releases no longer bundle corepack, which we use to get pnpm.

FROM node:24-alpine3.23 AS build-base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

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


# Local static preview
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod-preview

COPY nginx/local-prod-preview.conf /etc/nginx/conf.d/default.conf
COPY --from=build-prod /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
