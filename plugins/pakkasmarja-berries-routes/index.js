/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const fs = require('fs');
  const moment = require('moment');
  const uuid = require('uuid4');
  const config = require('nconf');
  const request = require('request');
  const stream = require('stream');
  const multer = require('multer');
  const upload = multer({ dest: '/tmp/uploads/' });
  
  class Routes {
    
    constructor (logger, models, userManagement, webhooks, clusterMessages) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.webhooks = webhooks;
      this.clusterMessages = clusterMessages;
    }
    
    getIndex(req, res) {
      res.render('index', Object.assign({ 

      }, req.pakkasmarjaBerries));
    }
    
    getImagesWordpress(req, res) {
      const contentUrl = config.get('wordpress:content-url');
      const forwardHeaderNames = ['if-none-match', 'cache-control'];
      const requestHeaders = {};
      const path = req.path.startsWith('/images/wordpress/') ? req.path.substring(18) : req.path;
      
      if (req.headers) {
        _.each(req.headers, (value, key) => {
          if (forwardHeaderNames.indexOf(key.toLowerCase()) > -1) {
            requestHeaders[key] = value;
          }
        });
      }
        
      request({
          url: `${contentUrl}/${path}`,
          headers: requestHeaders
      }).pipe(res);
    }
    
    getImagesMessages(req, res) {
      const messageId = req.params.messageId;
      const messageAttachmentId = req.params.messageAttachmentId;
      
      this.models.findMessageAttachments(messageAttachmentId)
        .then((messageAttachment) => {
          if (!messageAttachment || (parseInt(messageAttachment.messageId) !== parseInt(messageId))) {
            res.status(404).send();
          } else {
            res.set('Content-Type', messageAttachment.contentType);  
            res.set('Length', messageAttachment.size);
            res.status(200).send(messageAttachment.contents);
          }
        });
    }
    
    postImageUploadMessage(req, res) {
      const file = req.file;
      const threadId = req.body.threadId;
      const sessionId = req.body.sessionId;
      const baseUrl = this.getBaseUrl();
      
      this.models.findSession(sessionId)
        .then((session) => {
          if (!session || !session.userId) {
            res.status(403).send("Forbidden");
          } else {
            const userId = session.userId;
            
            fs.readFile(file.path, (readErr, data) => {
              if (readErr) {
                res.status(500).send(readErr);
              } else {        
                const fileName = file.originalname;
                const contentType = file.mimetype;
                const size = file.size;
                
                this.models.createMessage(threadId, userId, 'pending...')
                  .then((message) => {
                    this.models.createMessageAttachment(message.id, data, contentType, fileName, size)
                      .then((messageAttachment) => {
                        const messageId = message.id;
                        const messageAttachmentId = messageAttachment.id;
                        this.models.updateMessage(message.id, `<img src="${baseUrl}/images/messages/${messageId}/${messageAttachmentId}"/>`)
                          .then(() => {
                            const messageBuilder = this.clusterMessages.createMessageAddedBuilder();
                            messageBuilder.threadId(threadId).messageId(messageAttachmentId).send()
                              .then(() => {
                                res.status(200).send();
                              })
                              .catch((err) => {
                                this.logger.error(err);
                                res.status(500).send(err);
                              });
                          })
                          .catch((err) => {
                            this.logger.error(err);
                            res.status(500).send(err);
                          });
                      })
                      .catch((err) => {
                        this.logger.error(err);
                        res.status(500).send(err);
                      });
                  })
                  .catch((err) => {
                    this.logger.error(err);
                    res.status(500).send(err);
                  });
              }
            });
          }
        });
    }
    
    getKeycloak(req, res) {
      res.header('Content-Type', 'application/json');
      res.send({
        "realm": config.get('keycloak:realm'),
        "auth-server-url": config.get('keycloak:auth-server-url'),
        "ssl-required": config.get('keycloak:ssl-required'),
        "resource": config.get('keycloak:resource'),
        "public-client": config.get('keycloak:public-client')
      });
    }
    
    postJoin(req, res) {
      const keycloakServerUrl = config.get('keycloak:auth-server-url');
      const keycloakRealm = config.get('keycloak:realm');
      const keycloakUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;
      
      request.get(keycloakUrl, {
        'auth': {
          'bearer': req.body.token
        }
      }, (authErr, response, body) => {
        if (authErr) {
          // TODO: Better error handling
          this.logger.error(authErr);
          res.status(403).send(authErr);
        } else {
          try {
            const reponse = JSON.parse(body);
            const userId = reponse.sub;
            if (this.userManagement.isValidUserId(userId)) {
              this.models.createSession(userId)
                .then((session) => {
                  res.send({
                    sessionId: session.id
                  });
                })
                .catch((sessionErr) => {
                  this.logger.error(sessionErr);
                  res.status(500).send(sessionErr);
                });
            } else {
              this.logger.error(`Received invalid userId ${userId} from keycloak`);
              res.status(403).send("Forbidden");
            }
          } catch (e) {
            this.logger.error(e);
            res.status(500).send(e);
          }
        }
      });
    }
    
    getRestV1UserGroups(req, res) {
      this.userManagement.listGroups(config.get('keycloak:realm'))
        .then((userGroups) => {
           res.send(userGroups);
        })
        .catch((err) => {
          this.logger.error(err);
          res.status(500).send(err);
        });
    }
    
    postWebhooksManagement(req, res) {
      this.webhooks.handle('management', req);
      res.send("ok");
    }
    
    register(app, keycloak) {
      // Navigation     
      
      app.get("/", this.getIndex.bind(this));
      app.get("/images/wordpress/*", this.getImagesWordpress.bind(this));
      app.get("/images/messages/:messageId/:messageAttachmentId", this.getImagesMessages.bind(this));
      app.post("/images/upload/message", upload.single('image'), this.postImageUploadMessage.bind(this));
      
      // Keycloak
      
      app.get('/keycloak.json', this.getKeycloak.bind(this));
      app.post('/join', this.postJoin.bind(this));
      
      // REST
      
      // TODO: Add security!!!
      
      app.get('/rest/v1/usergroups', this.getRestV1UserGroups.bind(this));
      
      
      // Webhooks
      
      app.post('/webhooks/management', this.postWebhooksManagement.bind(this));
    }
    
    getBaseUrl() {
      const host = config.get('client:server:host');
      const secure = config.get('client:server:secure');
      const port = config.get('client:server:port');
      const protocol = secure ? 'https' : 'http';
      return `${protocol}://${host}:${port}`;
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const webhooks = imports['pakkasmarja-berries-webhooks'];
    const clusterMessages = imports['pakkasmarja-berries-cluster-messages'];
    
    const routes = new Routes(logger, models, userManagement, webhooks, clusterMessages);
    register(null, {
      'pakkasmarja-berries-routes': routes
    });
  };

})();
