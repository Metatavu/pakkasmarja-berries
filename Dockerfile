FROM node:carbon
WORKDIR /opt/wkhtmltopdf
RUN curl -sSL "https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.4/wkhtmltox-0.12.4_linux-generic-amd64.tar.xz"|tar -xvJ
WORKDIR /usr/src/pakkasmarja
RUN npm install grunt -g
RUN gem install sass
COPY package*.json ./
COPY docker-default-config.json ./default-config.json
RUN npm install
RUN grunt
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]
