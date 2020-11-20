FROM node:dubnium

WORKDIR /usr/src/pakkasmarja
ADD . .
COPY package*.json ./
RUN npm install

ADD docker/runtests.sh /opt/docker/entrypoint.sh
RUN chmod a+x /opt/docker/entrypoint.sh
CMD "/opt/docker/entrypoint.sh"
