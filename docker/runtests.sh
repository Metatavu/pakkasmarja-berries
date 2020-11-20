#/bin/sh

npm run build

HOST=http://pakkasmarja-api:3002
echo "Waiting for $HOST"
until $(curl --output /dev/null --silent --head --fail $HOST); do
  echo '.'
  sleep 5
done

npm run test