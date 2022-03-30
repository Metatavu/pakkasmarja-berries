FROM node:dubnium

# Install Redis
RUN apt update
RUN apt install redis-server sshfs -y

# Install WKHTMLTOPDF
WORKDIR /tmp
RUN wget "https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.stretch_amd64.deb"
RUN apt install /tmp/wkhtmltox_0.12.5-1.stretch_amd64.deb -y

# Copy package.json and run npm scripts
WORKDIR /usr/src/pakkasmarja
ADD . .
COPY package*.json ./
RUN npm install
RUN npm run build

# expose port for communication between containers
EXPOSE 3000

# Start services
ADD ./docker/entrypoint.sh /opt/docker/entrypoint.sh
RUN chmod a+x /opt/docker/entrypoint.sh
CMD "/opt/docker/entrypoint.sh"
