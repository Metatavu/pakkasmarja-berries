#!/bin/sh

openssl enc -d -pbkdf2 -aes-256-cbc -d -iter $ENC_ITER -md sha512 -pass env:ENC_PASS -in secured.tar.gz | tar xz