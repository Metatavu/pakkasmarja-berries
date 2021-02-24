#/bin/sh

cd /usr/src/pakkasmarja

echo "Waiting..."

until $(curl --connect-timeout 5 --max-time 10 --output /dev/null --silent --head --fail http://pakkasmarja-api:3000/system/ping); do
  curl --head http://pakkasmarja-api:3000/system/ping
  sleep 5
done

npm t