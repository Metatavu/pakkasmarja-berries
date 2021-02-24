#/bin/sh

until $(curl --output /dev/null --silent --head --fail http://pakkasmarja-api:3002); do
  printf '.'
  sleep 5
done