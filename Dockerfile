FROM node:dubnium
RUN apt update
RUN apt install redis-server sshfs -y
WORKDIR /tmp
RUN wget "https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.stretch_amd64.deb"
RUN apt install /tmp/wkhtmltox_0.12.5-1.stretch_amd64.deb -y
WORKDIR /usr/src/pakkasmarja
ADD . .
COPY package*.json ./
RUN npm install
RUN npm run build
EXPOSE 3000
ADD ./docker/entrypoint.sh /opt/docker/entrypoint.sh 
RUN chmod a+x /opt/docker/entrypoint.sh
CMD "/opt/docker/entrypoint.sh"
