#/bin/sh

npm run build

URL=http://pakkasmarja-api:3000/system/ping
echo "Waiting for $URL"
until $(curl --output /dev/null --silent --fail $URL); do
  echo '.'
  sleep 5
done

npm t