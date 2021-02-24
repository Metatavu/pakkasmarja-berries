#/bin/sh

until $(curl --connect-timeout 5 --max-time 10 --output /dev/null --silent --head --fail http://localhost:3002/system/ping); do
  curl --head http://localhost:3002/system/ping
  # echo '.'
  sleep 5
done