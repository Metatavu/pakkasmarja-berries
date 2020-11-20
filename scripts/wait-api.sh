#/bin/sh

HOST=http://localhost:3002
printf "Waiting for $HOST"
until $(curl --output /dev/null --silent --head --fail $HOST); do
  printf '.'
  sleep 5
done