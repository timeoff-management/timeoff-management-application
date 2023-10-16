# -------------------------------------------------------------------
# Minimal dockerfile from alpine base
#
# Instructions:
# =============
# 1. Create an empty directory and copy this file into it.
#
# 2. Create image with:
#	docker build --tag timeoff:latest .
#
# 3. Run with:
#	docker run -d -p 3000:3000 --name alpine_timeoff timeoff
#
# 4. Login to running container (to update config (vi config/app.json):
#	docker exec -ti --user root alpine_timeoff /bin/sh
# --------------------------------------------------------------------
FROM node:16-alpine

RUN apk update
#RUN apk upgrade

# Install dependencies
RUN apk add \
    git \
    make \
    python3 \
    g++ \
    gcc \
    libc-dev \
    clang

#Add user so it doesn't run as root
RUN adduser --system app --home /app

USER app
WORKDIR /app

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.docker.cmd="docker run -d -p 3000:3000 --name alpine_timeoff"

RUN adduser --system app --home /app
USER app

COPY . /app

RUN npm install -y

EXPOSE 3000

CMD npm start
