FROM node:dubnium
RUN apt update
RUN apt install redis-server -y
RUN apt install libssl1.0-dev -y
WORKDIR /opt/wkhtmltopdf
RUN curl -sSL "https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.4/wkhtmltox-0.12.4_linux-generic-amd64.tar.xz"|tar -xvJ
WORKDIR /usr/src/pakkasmarja
ADD . .
COPY package*.json ./
RUN npm install
RUN npm run build
EXPOSE 3000
ADD ./docker/entrypoint.sh /opt/docker/entrypoint.sh 
RUN chmod a+x /opt/docker/entrypoint.sh
CMD "/opt/docker/entrypoint.sh"
