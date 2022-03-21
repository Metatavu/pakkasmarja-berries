#!/bin/bash

echo "Starting docker container for MySQL..."
docker-compose -f docker-compose-prod.yml up -d mysql

sleep 5

CONTAINER_ID=pakkasmarja-berries-mysql-1
echo "MySQL container started with ID: $CONTAINER_ID"

docker cp ../prod-data/db_dumps/pm.sql $CONTAINER_ID:/tmp/pm.sql
docker cp ../prod-data/local.sql $CONTAINER_ID:/tmp/local.sql
echo "Copied database dump for Pakkasmarja"

echo "Creating databases with dump data..."
docker exec $CONTAINER_ID  mysql -uroot -proot -e 'DROP DATABASE IF EXISTS `pm`; CREATE DATABASE `pm` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */; USE pm; source /tmp/pm.sql; source /tmp/local.sql; commit;'

docker-compose -f docker-compose-prod.yml down