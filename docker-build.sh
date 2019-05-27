VERSION=$(node -p -e "require('./package.json').version")
rm -fR dist
npm install && grunt && npm run build
docker build -t pakkasmarja-server .
docker tag $(docker images -q pakkasmarja-server) metatavu/pakkasmarja-server:$VERSION
docker push metatavu/pakkasmarja-server
