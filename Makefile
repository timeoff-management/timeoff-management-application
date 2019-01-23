# Fork from https://github.com/docker-production-aws/microtrader/blob/master/Makefile

# MIT License

# Copyright (c) 2019 Jimmy Herrera
# Copyright (c) 2017 Justin Menga

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# Import local environment overrides
$(shell touch .env)
include .env

# Project variables
PROJECT_NAME ?= timeoff
PROJECT_NAMESPACE ?= arruko
DOCKER_IMAGE_NAME ?= timeoff
DOCKER_IMAGE_TEST_NAME ?= timeoff-dev
DOCKER_IMAGE_BASE_NAME ?= timeoff-base

# AWS ECR settings
AWS_ACCOUNT_ID ?= 184432115055
AWS_ZONE ?= us-east-2
DOCKER_REGISTRY ?= "$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_ZONE).amazonaws.com"
DOCKER_LOGIN_EXPRESSION := eval $$(aws ecr get-login --registry-ids $(AWS_ACCOUNT_ID) --no-include-email)

# Release settings
export HTTP_PORT ?= 3000
export DB_NAME ?= $(PROJECT_NAME)
export DB_USER ?= root
export DB_PASSWORD ?= null
export BUILD_ID ?=
export NODE_VERSION ?= 6.14.0
export PHANTOMJS_VERSION ?= 2.1.1
export TEST_MODE ?= phantomjs # chrome | phantomjs
export AWS_PROFILE ?= timeoff-admin

# Common settings
include Makefile.settings

.PHONY: version base test build release clean tag tag%default login logout publish compose dcompose database save load demo all

# Prints version
version:
	@ echo '{"Version": "$(APP_VERSION)"}'

# Runs base images build
# Pulls images and base images by default
base: login
	${INFO} "Build base images for release"
	@ docker build -f docker/base/Dockerfile.release -t $(DOCKER_IMAGE_BASE_NAME)-release:latest .
	${INFO} "Build base images for test"
	@ docker build -f docker/base/Dockerfile.test -t $(DOCKER_IMAGE_BASE_NAME)-test:latest .
	${INFO} "Tag images with docker registry"
	@ docker tag $(DOCKER_IMAGE_BASE_NAME)-test:latest $(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_BASE_NAME)-test:latest
	@ docker tag $(DOCKER_IMAGE_BASE_NAME)-release:latest $(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_BASE_NAME)-release:latest
	${INFO} "Publish images to docker registry"
	@ docker push "$(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_BASE_NAME)-test:latest"
	@ docker push "$(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_BASE_NAME)-release:latest"
	${INFO} "Base images complete"

# Runs unit and integration tests
# Pulls images and base images by default
# Use 'make test :nopull' to disable default pull behaviour
test:
	${INFO} "Building images..."
	@ docker-compose $(TEST_ARGS) build $(NOPULL_FLAG) timeoff test
	${INFO} "Running tests..."
	@ docker-compose $(TEST_ARGS) up --abort-on-container-exit --exit-code-from test timeoff test 
	${INFO} "Checking test results..."
	@ $(call check_exit_code,$(TEST_ARGS),test)
	${INFO} "Test complete"

# Builds release image and runs acceptance tests
# Use 'make release :nopull' to disable default pull behaviour
release:
	${INFO} "Building images..."
	@ docker-compose $(RELEASE_ARGS) build $(NOPULL_FLAG) db timeoff
	${INFO} "Starting timeoff database..."
	@ docker-compose $(RELEASE_ARGS) up -d db
	@ $(call check_service_health,$(RELEASE_ARGS),db)
	${INFO} "Starting timeoff service..."
	@ docker-compose $(RELEASE_ARGS) up -d timeoff
	@ $(call check_service_health,$(RELEASE_ARGS),timeoff)
	${INFO} "Acceptance testing complete"
	${INFO} "Timeoff is running at http://$(DOCKER_HOST_IP):$(call get_port_mapping,$(RELEASE_ARGS),timeoff,$(HTTP_PORT))"

# Executes a full workflow
all: clean base test release tag-default publish clean

# Cleans environment
clean: clean-test clean-release
	${INFO} "Removing dangling images..."
	@ $(call clean_dangling_images,$(DOCKER_IMAGE_BASE_NAME))
	@ $(call clean_dangling_images,$(DOCKER_IMAGE_NAME))
	@ $(call clean_dangling_images,$(DOCKER_IMAGE_TEST_NAME))
	${INFO} "Clean complete"

clean%test:
	${INFO} "Destroying test environment..."
	@ docker-compose $(TEST_ARGS) down -v || true

clean%release:
	${INFO} "Destroying release environment..."
	@ docker-compose $(RELEASE_ARGS) down -v || true

# 'make tag <tag> [<tag>...]' tags development and/or release image with specified tag(s)
tag:
	${INFO} "Tagging development image with tags $(TAG_ARGS)..."
	@ $(foreach tag,$(TAG_ARGS),$(call tag_image,$(TEST_ARGS),test,$(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_TEST_NAME):$(tag));)
	${INFO} "Tagging release images with tags $(TAG_ARGS)..."
	@ $(foreach tag,$(TAG_ARGS),$(call tag_image,$(RELEASE_ARGS),timeoff,$(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_NAME):$(tag));)
	${INFO} "Tagging complete"

# Tags with default set of tags
tag%default:
	@ make tag latest $(APP_VERSION) $(COMMIT_ID) $(COMMIT_TAG)

# Login to Docker registry
login:
	${INFO} "Logging in to Docker registry $$DOCKER_REGISTRY..."
	@ $(DOCKER_LOGIN_EXPRESSION)
	${INFO} "Logged in to Docker registry $$DOCKER_REGISTRY"

# Logout of Docker registry
logout:
	${INFO} "Logging out of Docker registry $$DOCKER_REGISTRY..."
	@ docker logout
	${INFO} "Logged out of Docker registry $$DOCKER_REGISTRY"

# Publishes image(s) tagged using make tag commands
publish:
	${INFO} "Publishing release images to $(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)..."
	@ $(call publish_image,$(RELEASE_ARGS),timeoff,$(DOCKER_REGISTRY)/$(PROJECT_NAMESPACE)/$(DOCKER_IMAGE_NAME))
	${INFO} "Publish complete"

# Executes docker-compose commands in release environment
#   e.g. 'make compose ps' is the equivalent of docker-compose -f path/to/dockerfile -p <project-name> ps
#   e.g. 'make compose run nginx' is the equivalent of docker-compose -f path/to/dockerfile -p <project-name> run nginx
#
# Use '--'' after make to pass flags/arguments
#   e.g. 'make -- compose run --rm nginx' ensures the '--rm' flag is passed to docker-compose and not interpreted by make
compose:
	${INFO} "Running docker-compose command in release environment..."
	@ docker-compose -p $(REL_PROJECT) -f $(REL_COMPOSE_FILE) $(ARGS)

# Executes docker-compose commands in test environment
#   e.g. 'make dcompose ps' is the equivalent of docker-compose -f path/to/dockerfile -p <project-name> ps
#   e.g. 'make dcompose run test' is the equivalent of docker-compose -f path/to/dockerfile -p <project-name> run test
#
# Use '--'' after make to pass flags/arguments
#   e.g. 'make -- compose run --rm test' ensures the '--rm' flag is passed to docker-compose and not interpreted by make
dcompose:
	${INFO} "Running docker-compose command in test environment..."
	@ docker-compose -p $(TEST_PROJECT) -f $(TEST_COMPOSE_FILE) $(ARGS)

# IMPORTANT - ensures arguments are not interpreted as make targets
%:
	@:
