#/bin/sh

until $(curl --output /dev/null --silent --head --fail http://pakkasmarja-api:3002); do
  echo '.'
  sleep 5
done