# -------------------------------------------------------------------
# Minimal dockerfile from ubuntu base
#
# Instructions:
# =============
# 1. Create an empty directory and copy this file into it.
#
# 2. Create image with: 
#	docker build --tag timeoff:latest .
#
# 3. Run with: 
#	docker run -d -p 3000:3000 --name ubuntu_timeoff timeoff
#
# 4. Login to running container (to update config (vi config/app.json): 
#	docker exec -ti --user root ubuntu_timeoff /bin/sh
# --------------------------------------------------------------------
FROM ubuntu:focal as dependencies

RUN apt update && apt install -y \
    curl && \
    curl -sL https://deb.nodesource.com/setup_13.x | bash - && \
    apt install -y nodejs && \
    apt clean autoclean && \
    apt autoremove --yes && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

COPY package.json  .
RUN npm install 

FROM ubuntu:focal

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.docker.cmd="docker run -d -p 3000:3000 --name alpine_timeoff"

RUN apt update && apt install -y \
    curl && \
    curl -sL https://deb.nodesource.com/setup_13.x | bash - && \
    apt install -y nodejs vim && \
    apt clean autoclean && \
    apt autoremove --yes && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN adduser --system app --home /app
USER app
WORKDIR /app
COPY . /app
COPY --from=dependencies node_modules ./node_modules

EXPOSE 3000

ENTRYPOINT ["npm", "start"]
