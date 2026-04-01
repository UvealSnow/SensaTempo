ARG STORYBLOK_ACCESS_TOKEN
ARG PUBLIC_DEFAULT_LANGUAGE
ARG PUBLIC_AVAILABLE_LANGUAGES

FROM node:lts-alpine3.23 AS build-base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
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

ENV NODE_ENV=production
ENV PUBLIC_BUILD_TYPE=server
RUN pnpm build


# This is the container that is actually deployed
FROM node:lts-alpine3.23 AS live-preview

WORKDIR /app

# This allows our little server to run in Lambda
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=build-preview /app/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]


# Local version of the prod build
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod-preview

COPY nginx/local-prod-preview.conf /etc/nginx/conf.d/default.conf
COPY --from=build-prod /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
