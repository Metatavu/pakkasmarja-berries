/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const fs = require('fs');
  const path = require('path');
  const moment = require('moment');
  const uuid = require('uuid4');
  const config = require('nconf');
  const request = require('request');
  const stream = require('stream');
  const multer = require('multer');
  const upload = multer({ dest: '/tmp/uploads/' });
  const auth = require('basic-auth');
  
  class Routes {
    
    constructor (logger, models, userManagement, webhooks, clusterMessages, pushNotifications) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.webhooks = webhooks;
      this.clusterMessages = clusterMessages;
      this.pushNotifications = pushNotifications;
    }
    
    getWebApp(req, res) {
      res.sendFile(path.join(__dirname, '..', '..', 'webapp', 'index.html'));
    }
    
    getSystemPing(req, res) {
      res.send("PONG");
    }

    getVersion(req, res) {
      res.send(config.get('app-version'));
    }

    getSignCallback(req, res) {
      res.render("signcallback", {

      });
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
      const userId = req.userId;
      const file = req.file;
      const threadId = req.body.threadId;
      const sessionId = req.body.sessionId;
      const baseUrl = this.getBaseUrl();
      
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
                      messageBuilder.threadId(threadId).messageId(messageId).send()
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
    
    getKeycloak(req, res) {
      res.header('Content-Type', 'application/json');
      res.send(config.get('keycloak:app'));
    }

    getAppConfig(req, res) {
      fs.readFile(`${__dirname}/../../app-config.json`, (err, file) => {
        if (err) {
          res.status(500).send(err);
        } else {
          res.header('Content-Type', 'application/json');
          res.send(file);
        }
      });
    }
    
    postJoin(req, res) {
      const keycloakServerUrl = config.get("keycloak:app:auth-server-url");
      const keycloakRealm = config.get("keycloak:app:realm");
      const keycloakUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;
      
      request.get(keycloakUrl, {
        'auth': {
          'bearer': req.body.token
        }
      }, (authErr, response, body) => {
        if (authErr) {
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
                    sessionId: session.id,
                    userId: userId
                  });
                  this.syncUserQuestionGroupThreads(userId)
                    .then(() => {})
                    .catch((err) => {
                      this.logger.error('Error synchonizing user group threads', err);
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
    
    restAuth(req, res, next) {
      const credentials = auth(req);
      if (credentials) {
        const client = config.get(`rest:clients:${credentials.name}`);
        if (client && (credentials.pass === client.secret)) {
          return next();
        }  
      }
      
      res.header('WWW-Authenticate', 'Basic realm="REST"')
        .status(401)
        .send('Access denied');
    }
    
    requireLogged(req, res, next) {
      const sessionId = req.body.sessionId || req.query.sessionId;
      
      this.models.findSession(sessionId)
        .then((session) => {
          if (!session || !session.userId) {
            res.status(403).send("Forbidden");
          } else {
            req.userId = session.userId;
            next();
          }
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
    
    requirePermissionToPostThread(req, res, next) {
      const userId = req.userId;
      const threadId = req.body.threadId;
      const keycloakRealm = config.get('keycloak:realm');
      
      this.userManagement.checkPermissionToPostThread(keycloakRealm, userId, threadId)
        .then((permission) => {
          if (permission) {
            next();
          } else {
            res.status(403).send("Forbidden");
          }
        })
        .catch(() => {
          this.logger.error(`Failed to resolve whether ${userId} has permission to post into thread ${threadId}`);
        });
    }
    
    requirePermissionToReadMessage(req, res, next) {
      const userId = req.userId;
      const messageId = req.params.messageId;
      const keycloakRealm = config.get('keycloak:realm');
      
      this.userManagement.checkPermissionToReadMessage(keycloakRealm, userId, messageId)
        .then((permission) => {
          if (permission) {
            next();
          } else {
            res.status(403).send("Forbidden");
          }
        })
        .catch(() => {
          this.logger.error(`Failed to resolve whether ${userId} has permission to read message ${messageId}`);
        });
    }
    
    /**
    * Shutdown system
    * Shuts the system down
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    postSystemShutdown(req, res) {
      if (config.get('mode') !== 'TEST') {
        res.status(403).send("I'm sorry Dave, I'm afraid I can't do that");
        return;
      }
      
      try {
        res.status(204).send();
      } finally {
        process.exit(0);
      }
    }
    
    register(app, keycloak) {
      // Navigation     
      
      app.get("/", this.getWebApp.bind(this));
      app.get("/version", this.getVersion.bind(this));
      app.get("/signcallback", this.getSignCallback.bind(this));
      app.get("/system/ping", this.getSystemPing.bind(this));
      app.post("/system/shutdown", this.postSystemShutdown.bind(this));
      
      app.get("/images/wordpress/*", [ this.requireLogged.bind(this) ], this.getImagesWordpress.bind(this));
      app.get("/images/messages/:messageId/:messageAttachmentId", [ this.requireLogged.bind(this), this.requirePermissionToReadMessage.bind(this) ], this.getImagesMessages.bind(this));
      app.post("/images/upload/message", [ upload.single('image'), this.requireLogged.bind(this), this.requirePermissionToPostThread.bind(this) ], this.postImageUploadMessage.bind(this));
      
      // Keycloak
      
      app.get('/keycloak.json', this.getKeycloak.bind(this));
      app.get('/app-config.json', this.getAppConfig.bind(this));
      app.post('/join', this.postJoin.bind(this));
      
      // REST
      
      app.get('/rest/v1/usergroups', [ this.restAuth.bind(this) ], this.getRestV1UserGroups.bind(this));
      
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
    
    syncUserQuestionGroupThreads(userId) {
      return this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
        .then((userGroupIds) => {
          return this.models.listQuestionGroupsByUserGroupIdsAndRole(userGroupIds, 'user')
            .then((questionGroups) => {
              const userGroupThreadUpsertPromises = [];
              for (let i = 0; i < questionGroups.length; i++) {
                userGroupThreadUpsertPromises.push(this.models.findOrCreateQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroups[i].id, userId));
              }
              return Promise.all(userGroupThreadUpsertPromises);
            });
        });
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const webhooks = imports['pakkasmarja-berries-webhooks'];
    const clusterMessages = imports['pakkasmarja-berries-cluster-messages'];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
    
    const routes = new Routes(logger, models, userManagement, webhooks, clusterMessages, pushNotifications);
    register(null, {
      'pakkasmarja-berries-routes': routes
    });
  };

})();
