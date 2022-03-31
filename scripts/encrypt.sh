#/bin/sh

tar -czf - ./test/sap-api-wiremock ./test-volumes/odata-mock | openssl enc -pbkdf2 -aes-256-cbc -iter $ENC_ITER -md sha512 -pass env:ENC_PASS -out secured.tar.gz