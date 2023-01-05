# -------------------------------------------------------------------
# Dockerfile of Node13 on top of Debian Buster
#
# Instructions:
# =============
# 1. Create an empty directory and copy this file into it.
#
# 2. Create image with: 
#	docker build --tag timeoff:latest .
#
# 3. Run with: 
#	docker run -d -p 3000:3000 --name busterslim_timeoff timeoff
#
# 4. Login to running container (to update config (vi config/app.json): 
#	docker exec -ti --user root busterslim_timeoff /bin/sh
# --------------------------------------------------------------------
FROM node:13-buster-slim

RUN apt update && \
    apt install -y \
      sqlite3 

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.docker.cmd="docker run -d -p 3000:3000 --name busterslim_timeoff"
COPY . /app
WORKDIR /app
RUN chmod u+x /app/package.json /app/package-lock.json
RUN npm install 
CMD npm start
 
EXPOSE 3000