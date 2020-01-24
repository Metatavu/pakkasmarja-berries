DELAY=${STARTUP_DELAY:-0}
echo "Sleeping for $DELAY"
sleep $DELAY
mkdir /opt/pakkasmarja-sap/ &&
echo "Mouting SFTP..." &&
sshfs -o allow_other -o IdentityFile=$SAP_SFTP_IDENTITY_FILE -o StrictHostKeyChecking=no -p $SAP_SFTP_PORT $SAP_SFTP_HOST /opt/pakkasmarja-sap/ 
echo "Starting Redis..." &&
service redis-server start &&
cd /usr/src/pakkasmarja &&
npm start