# pakkasmarja-berries
Shady Engine backend worker for Pakkasmarja Berries application

## Running in Docker 

### Prerequisites

These instructions assume that system is being installed on machine with Ubuntu 16.04 OS and that you have DNS address pointing to your server.

### Install Docker

    sudo apt-get update
    sudo apt-get install apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install docker-ce

### Setup environment variables

Change following variables to match your configuration

    export SERVER_NAME=somewhere.example.com
    export APP_PORT=443
    export WP_PORT=444
    export KEYCLOAK_PORT=445

### Install Nginx

    sudo add-apt-repository ppa:certbot/certbot
    sudo apt-get update
    sudo apt-get install nginx
    sudo apt-get install python-certbot-nginx

    echo "
      server {
        listen 80 default_server;
        listen [::]:80 default_server;
        root /var/www/html;
        server_name $SERVER_NAME;

        location / {
        }
      }
    " > /etc/nginx/sites-enabled/default

    sudo service nginx restart
    sudo certbot --nginx

    echo "
      server {
        listen $APP_PORT ssl;
        listen $WP_PORT ssl;
        listen $KEYCLOAK_PORT ssl;
        root /var/www/html;
        server_name $SERVER_NAME;
        ssl_certificate /etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${SERVER_NAME}/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        location ~ /wp-.* {
          proxy_set_header X-Real-IP \$remote_addr;
          proxy_set_header Host \$host;
          proxy_set_header Upgrade \$http_upgrade;
          proxy_set_header Connection upgrade;
          proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Port \$server_port;
          proxy_set_header X-Forwarded-Host \$host:\$server_port;
          proxy_set_header X-Forwarded-Proto https;
          proxy_pass http://127.0.0.1:\${server_port}10;
        }

        location / {
          if (\$server_port = $WP_PORT) {
            return 301 \$scheme://\$host:\${server_port}\${request_uri}wp-admin/;
          }

          proxy_set_header X-Real-IP \$remote_addr;
          proxy_set_header Host \$host;
          proxy_set_header Upgrade \$http_upgrade;
          proxy_set_header Connection upgrade;
          proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Port \$server_port;
          proxy_set_header X-Forwarded-Host \$host:\$server_port;
          proxy_set_header X-Forwarded-Proto https;
          proxy_pass http://127.0.0.1:\${server_port}10;
        }

      }
    " > /etc/nginx/sites-enabled/default

    sudo service nginx restart

### Install Rabbid MQ

    docker run -d --hostname rabbitmq --name rabbitmq rabbitmq:3

### Install MySQL

    docker run --name mysql -e MYSQL_ROOT_PASSWORD=mypass -d mysql

### Install Keycloak

    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE DATABASE keycloak DEFAULT CHARACTER SET utf8'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE USER keycloak IDENTIFIED BY "kcpass"'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'GRANT ALL ON keycloak.* TO keycloak'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'FLUSH PRIVILEGES'

    docker run -p ${KEYCLOAK_PORT}10:8080 --name keycloak --link mysql:mysql -e MYSQL_DATABASE=keycloak -e MYSQL_USER=keycloak -e MYSQL_PASSWORD=kcpass -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=admin -e PROXY_ADDRESS_FORWARDING=true -d jboss/keycloak

Now the Keycloak should be running in https://somewhere.example.com:445. 

### Setup Keycloak realm

You should create new realm called 'pm' and add following clients:

#### pmserver

- Client Protocol: openid-connect
- Access Type: bearer-only

#### pm

- Client Protocol: openid-connect
- Access Type: public
  
#### pmwp

- Client Protocol: openid-connect
- Access Type: confidential
  
*Admin user login credentials are admin / admin*

### Wordpress

#### Setup environment variables

    export KEYCLOAK_CLIENT_SECRET=[client secret from pmwp credentials]
    export KEYCLOAK_BASE=https://$SERVER_NAME:${KEYCLOAK_PORT}/auth/realms/pm
    export REALM_ADMIN_USER=someone
    export REALM_ADMIN_EMAIL=someone@example.com
    export WORDPRESS_MANAGEMENT_CONF='{ "api-url": "https://${SERVER_NAME}:'${APP_PORT}'/rest/v1" }'
    export WORDPRESS_OPENID_CONF='{ "login_type":"auto", "client_id":"pmwp", "client_secret":"${KEYCLOAK_CLIENT_SECRET}", "scope":"openid", "endpoint_login":"'${KEYCLOAK_BASE}'\/protocol\/openid-connect\/auth", "endpoint_userinfo":"'${KEYCLOAK_BASE}'\/protocol\/openid-connect\/userinfo", "endpoint_token":"'${KEYCLOAK_BASE}'\/protocol\/openid-connect\/token", "endpoint_end_session":"'${KEYCLOAK_BASE}'\/protocol\/openid-connect\/logout", "identity_key":"preferred_username", "no_sslverify":"0", "http_request_timeout":"5", "enforce_privacy":"1", "alternate_redirect_uri":"0", "nickname_key":"preferred_username", "email_format":"{email}", "displayname_format":"", "identify_with_username":"0", "link_existing_users":"1", "redirect_user_back":"0", "enable_logging":"1", "log_limit":"1000" }'

#### Install

    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE DATABASE wordpress DEFAULT CHARACTER SET utf8' &&
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE USER wordpress IDENTIFIED BY "wppass"' &&
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'GRANT ALL ON wordpress.* TO wordpress' &&
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'FLUSH PRIVILEGES' &&
    docker run -p ${WP_PORT}10:80 --name wordpress --link mysql:mysql -e WORDPRESS_DB_USER="wordpress" -e WORDPRESS_DB_PASSWORD="wppass" -d wordpress &&
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli core install --url="https://${SERVER_NAME}:${WP_PORT}/" --title="Pakkasmarja Hallinta - testi" --admin_user="${REALM_ADMIN_USER}" --admin_email="${REALM_ADMIN_EMAIL}" &&
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli plugin install members --activate && 
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli plugin install https://github.com/daggerhart/openid-connect-generic/archive/3.3.1.zip --activate && 
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli plugin install https://github.com/Metatavu/wordpress-pakkasmarja-management/archive/master.zip --activate && 
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli option update pakkasmarja_management "$WORDPRESS_MANAGEMENT_CONF" --format=json && 
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli option update openid_connect_generic_settings "$WORDPRESS_OPENID_CONF" --format=json && 
    docker run -u33 -it --rm --volumes-from wordpress --network container:wordpress wordpress:cli language core install fi --activate
    
Now the Wordpress should be running in https://somewhere.example.com:444. 

### Pakkasmarja Server

    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'GRANT ALL ON pakkasmarja.* TO pakkasmarja'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE DATABASE pakkasmarja DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'FLUSH PRIVILEGES'
    docker exec -e MYSQL_PWD=mypass mysql mysql -e 'CREATE USER pakkasmarja IDENTIFIED BY "pmpass"'
    
    cd /tmp
    https://github.com/Metatavu/pakkasmarja-berries.git
    docker build -t metatavu/pakkasmarja-berries .

    docker run -p ${APP_PORT}10:3000 -d --name pakkasmarja-berries --link mysql:mysql --link rabbitmq:rabbitmq \
      -e AMQP__URL=amqp://guest:guest@rabbitmq \
      -e SESSION-SECRET=asd \
      -e KEYCLOAK__ADMIN__REALM=pm \
      -e KEYCLOAK__ADMIN__BASEURL=https://$SERVER_NAME:${KEYCLOAK_PORT}/auth \
      -e KEYCLOAK__ADMIN__USERNAME=admin \
      -e KEYCLOAK__ADMIN__PASSWORD=admin \
      -e KEYCLOAK__REST__REALM=pm \
      -e KEYCLOAK__REST__AUTH_SERVER_URL=https://$SERVER_NAME:${KEYCLOAK_PORT}/auth \
      -e KEYCLOAK__REST__RESOURCE=pmserver \
      -e KEYCLOAK__APP__REALM=pm \
      -e KEYCLOAK__APP__AUTH_SERVER_URL=https://$SERVER_NAME:${KEYCLOAK_PORT}/auth \
      -e KEYCLOAK__APP__RESOURCE=pm \
      -e WORDPRESS__API-URL=https://$SERVER_NAME:$WP_PORT/wp-json \
      -e WORDPRESS__USERNAME=fake \
      -e WORDPRESS__PASSWORD=pass \
      -e WORDPRESS__CONTENT_URL=https://$SERVER_NAME:$WP_PORT/wp-content \
      -e MYSQL__DATABASE=pakkasmarja \
      -e MYSQL__USERNAME=pakkasmarja \
      -e MYSQL__PASSWORD=pmpass \
      -e SAP__IMPORT_FILE=/usr/src/SAP-Export.xml \
      metatavu/pakkasmarja-berries

Now the Server should be running in https://somewhere.example.com:443.

### SAP data

Obtain a SAP-Export file (e.g. from https://github.com/Metatavu/pakkasmarja-berries/blob/master/test/data/SAP-Export.xml)

You may copy the data-file into the container with following command:

    docker cp /tmp/SAP-Export.xml pakkasmarja-berries:/usr/src/
