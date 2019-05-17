rm -fR dist
npm install && grunt && npm run build
docker build -t pakkasmarja-server .
docker tag $(docker images -q pakkasmarja-server) metatavu/pakkasmarja-server:3.0.3
docker push metatavu/pakkasmarja-server
