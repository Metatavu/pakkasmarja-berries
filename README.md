# pakkasmarja-berries

This guide assumes that you are running on linux and have installed docker, docker-compose and nodejs v10.18.1

## setup

- Open terminal in project root folder and run    `npm i; docker-compose build; npm run build`.

- If missing, add the following line to hosts file (found in /etc/hosts in your computer):   `127.0.0.1  test-keycloak`.

## running the environment

*Data from /tmp-folder is deleted when user logs out or closes the computer. Run the following command every time when either one has happened*

- Open terminal in project root folder and run    `mkdir /tmp/pakkasmail /tmp/pakkaspush /tmp/sapxml`.

- In the same terminal run    `docker-compose up`.

## running tests

- Open another terminal and run   `npm run test`.

## stopping the environment

- In terminal where environment is running, press <kbd>Ctrl</kbd>+<kbd>C</kbd> and wait until containers have shut down.

- Run   `docker-compose down && docker-compose rm`.

## Build ERP services

./gradlew clean build -PtargetEnvironment=local && 
docker build -f src/main/docker/Dockerfile.jvm -t metatavu/erp-service:latest .<div id="metatavu-custom-footer"><div align="center">
    <img src="https://metatavu.fi/wp-content/uploads/2024/02/cropped-metatavu-favicon.jpg" alt="Organization Logo" width="100">
    <p>© 2024 Metatavu. All rights reserved.</p>
    <p>
        <a href="https://www.metatavu.fi">Website</a> | 
        <a href="https://twitter.com/metatavu">Twitter</a> | 
        <a href="https://fi.linkedin.com/company/metatavu">LinkedIn</a>
    </p>
</div></div>