#/bin/sh

until $(curl --output /dev/null --silent --head --fail http://pakkasmarja-api:3002/system/ping); do
  curl --head http://pakkasmarja-api:3002/system/ping
  # echo '.'
  sleep 5
done