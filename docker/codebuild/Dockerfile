FROM docker:dind

RUN apk add --no-cache bash python py2-pip make jq git && \
    apk add --no-cache --virtual=build-dependencies gcc python-dev libffi-dev musl-dev openssl-dev && \
    pip install pip -U && \
    pip install --no-cache-dir docker-compose awscli ansible && \
    apk del build-dependencies