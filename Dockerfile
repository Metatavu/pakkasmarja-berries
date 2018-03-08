FROM node:carbon
WORKDIR /opt/wkhtmltopdf
RUN curl -sSL "https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.4/wkhtmltox-0.12.4_linux-generic-amd64.tar.xz"|tar -xvJ
WORKDIR /usr/src/pakkasmarja
COPY package*.json ./
COPY docker-default-config.json ./default-config.json
RUN npm install
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]
