DELAY=${STARTUP_DELAY:-0}
echo "Sleeping for $DELAY"
sleep $DELAY
echo "Starting Redis..." &&
service redis-server start &&
cd /usr/src/pakkasmarja &&
npm start