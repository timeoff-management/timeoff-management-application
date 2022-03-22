# -------------------------------------------------------------------
# Minimal dockerfile from alpine base
#
# Instructions:
# =============
# 1. Create an empty directory and copy this file into it.
#
# 2. Create image with: 
#	docker build --target=ready --tag timeoff:latest .
#
# 3. Run with: 
#	docker run -d -p 3000:3000 --name alpine_timeoff timeoff
#
# 4. Login to running container (to update config (vi config/app.json)): 
#	docker exec -ti --user root alpine_timeoff /bin/sh
#
# 5. To run tests, just build the entire image (without the '--target' specification):
#	docker build --tag timeoff:latest .
#
# 6. To build a new 'build' image (used in jenkinsfile), just build with --target=base:
#	docker build --tag timeoff:latest .
# --------------------------------------------------------------------
FROM alpine:3.13 AS base

EXPOSE 3000

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.docker.cmd="docker run -d -p 3000:3000 --name alpine_timeoff"

RUN apk add --no-cache \
    git \
    make \
    nodejs npm \
    python3 \
    python2 \
    vim \
    gcc \
    g++ \
    libc-dev

RUN adduser --system app --home /app 
USER app
WORKDIR /app

FROM base as ready
RUN git clone https://github.com/snwbr/timeoff-management-application.git timeoff-management
WORKDIR /app/timeoff-management

## npm ci is the way to build js code in CI platforms (https://docs.npmjs.com/cli/v8/commands/npm-ci).
RUN npm ci
CMD npm start

## Using multistage dockerfile to test while reusing the same dockerfile
FROM ready as test
## Commenting the tests out since tests don't support ci silent tests (repo maintenance is too old and mostly dead). See the README, section "Run tests"
## normally I would run something like this
## RUN npm test
## Adding an ENV as a dummy sentence to avoid having the test stage empty. ENV won't generate a new layer.
ENV im='dummy'
