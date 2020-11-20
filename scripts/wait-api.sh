#/bin/sh

HOST=http://localhost:3002
echo "Waiting for $HOST"
until $(curl --output /dev/null --silent --head --fail $HOST); do
  echo '.'
  sleep 5
done