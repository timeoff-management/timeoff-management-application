FROM seegno/node:7-slim

USER root

RUN apk --no-cache --virtual add sqlite

USER node

RUN npm install

COPY . ./

RUN npm rebuild

CMD ["bin/wwww"]
