# Variables
IMAGE_NAME := sensatempo-prod
PREVIEW_IMAGE := sensatempo-preview
DOCKERFILE := ./docker/Dockerfile

# Load PUBLIC variables from .env for build-args
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
		--platform linux/arm64 \
		--secret id=DOTENV,src=.env \
		--build-arg PUBLIC_DEFAULT_LANGUAGE=$(PUBLIC_DEFAULT_LANGUAGE) \
		--build-arg PUBLIC_AVAILABLE_LANGUAGES=$(PUBLIC_AVAILABLE_LANGUAGES) \
		-t $(if $(2),$(2),$(IMAGE_NAME)):latest .
endef

.PHONY: build-prod build-preview run-preview run-prod-preview clean

# Build the Production Static Site (with secret mount)
build-prod:
	$(call draw_header,${GREEN},Building Production Static HTML files...)
	$(call docker_build,build-prod)


# Build the SSR Preview Container
build-preview:
	$(call draw_header,${GREEN},Building Live Preview Image...)
	$(call docker_build,live-preview,${PREVIEW_IMAGE})


run-preview:
	$(call draw_header,${GREEN},Building Live Preview Image...)
	$(call docker_build,live-preview,${PREVIEW_IMAGE})
	docker run --rm -p 8080:8080 $(PREVIEW_IMAGE):latest


# Run the local Nginx preview of the production build
run-prod-preview:
	$(call draw_header,${GREEN},Building Production Static Preview...)
	$(call docker_build,prod-preview)
	$(call draw_header,${GREEN},Starting local Node SSG preview on http://localhost:8080)
	docker run --rm -p 8080:8080 $(IMAGE_NAME):latest


# Clean up local docker images
clean:
	docker rmi $(IMAGE_NAME):latest $(PREVIEW_IMAGE):latest || true

