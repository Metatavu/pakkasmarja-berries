docker build -t pakkasmarja-server .
docker tag $(docker images -q pakkasmarja-server) metatavu/pakkasmarja-server:develop
docker push metatavu/pakkasmarja-server
