# Variables
IMAGE_NAME := sensatempo-prod
DOCKERFILE := ./docker/Dockerfile
PREVIEW_LAMBDA_NAME ?= sensatempo-preview-ssr
PREVIEW_ZIP := preview-lambda.zip

# Load PUBLIC variables from .env for build-args
AWS_REGION ?= us-east-1
PUBLIC_DEFAULT_LANGUAGE ?= $(shell grep '^PUBLIC_DEFAULT_LANGUAGE=' .env | cut -d'=' -f2)
PUBLIC_AVAILABLE_LANGUAGES ?= $(shell grep '^PUBLIC_AVAILABLE_LANGUAGES=' .env | cut -d'=' -f2)

# Color Definitions
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
CYAN   := $(shell tput -Txterm setaf 6)
RESET  := $(shell tput -Txterm sgr0)

# Recipes
define draw_header
	@printf "\n$(1)--------------------------------------------------${RESET}\n"
	@printf "$(1)$(2)${RESET}\n"
	@printf "$(1)--------------------------------------------------${RESET}\n\n"
endef

define docker_build
	docker build -f $(DOCKERFILE) \
		--target $(1) \
		--secret id=DOTENV,src=.env \
		--build-arg PUBLIC_DEFAULT_LANGUAGE=$(PUBLIC_DEFAULT_LANGUAGE) \
		--build-arg PUBLIC_AVAILABLE_LANGUAGES=$(PUBLIC_AVAILABLE_LANGUAGES) \
		-t $(IMAGE_NAME):latest .
endef

.PHONY: build-prod run-prod-preview run-preview package-preview deploy-preview clean

# Build the Production Static Site (with secret mount)
build-prod:
	$(call draw_header,${GREEN},Building Production Static HTML files...)
	$(call docker_build,build-prod)


# Run the local Nginx preview of the production build
run-prod-preview:
	$(call draw_header,${GREEN},Building Production Static Preview...)
	$(call docker_build,prod-preview)
	$(call draw_header,${GREEN},Starting local Nginx static preview on http://localhost:8080)
	docker run --rm -p 8080:8080 $(IMAGE_NAME):latest


# Run the SSR preview server locally (what the preview Lambda runs)
# .env provides the runtime env the Lambda gets from SSM: STORYBLOK_PREVIEW_TOKEN, optional PREVIEW_BASIC_AUTH_*
run-preview:
	$(call draw_header,${GREEN},Building SSR preview...)
	PUBLIC_BUILD_TYPE=server pnpm build
	$(call draw_header,${GREEN},Starting SSR preview on http://localhost:8080)
	PORT=8080 NODE_ENV=production node --env-file-if-exists=.env ./dist/server/entry.mjs


# Build the SSR preview and zip it for Lambda (linux arm64)
package-preview:
	$(call draw_header,${GREEN},Packaging preview Lambda...)
	scripts/package-preview.sh $(PREVIEW_ZIP)


# Package and deploy the preview Lambda from this machine (CI does the same on main)
deploy-preview: package-preview
	$(call draw_header,${GREEN},Updating Lambda function code...)
	aws lambda update-function-code \
		--function-name $(PREVIEW_LAMBDA_NAME) \
		--zip-file fileb://$(PREVIEW_ZIP) \
		--region $(AWS_REGION)
	aws lambda wait function-updated --function-name $(PREVIEW_LAMBDA_NAME) --region $(AWS_REGION)


# Clean up local docker images and packages
clean:
	docker rmi $(IMAGE_NAME):latest || true
	rm -f $(PREVIEW_ZIP)
