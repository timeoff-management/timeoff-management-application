FROM alpine:3.8
RUN apk add --no-cache \
    git \
    make \
    nodejs npm \
    python \
    vim

WORKDIR /app
COPY . .
RUN npm install
CMD npm start
EXPOSE 3000

