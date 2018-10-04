/* jshint esversion: 6 */
(() => {
  "use strict";
  
  const _ = require('lodash');
  
  class PakkasmarjaBerriesScheluders {
    
    constructor (logger, wordpress, models, pakkasmarjaBerriesUtils) {
      this.logger = logger;
      this.wordpress = wordpress;
      this.models = models;
      this.pakkasmarjaBerriesUtils = pakkasmarjaBerriesUtils;
    }
    
    syncManagementNewsArticles() {
      console.log("[schedulers] Starting to sync news articles...");
      this.models.findAllNewsArticles()
        .then((articles) => {
          this.wordpress.listPosts(1, 99)
          .then((posts) => {
            const existingManagementIds = posts.map((post) => {
              return post.id.toString();
            });
            
            const articlesToRemove = _.filter(articles, (article) => {
              return existingManagementIds.indexOf(article.originId) < 0;
            });
            
            for (let i = 0; i < articlesToRemove.length; i++) {
              this.models.removeNewsArticle(articlesToRemove[i].id);
            }
            
            posts.forEach((wpPost) => {
              this.pakkasmarjaBerriesUtils.updateOrCreateManagementPost(wpPost, true);
            });
            
          });
        });
    }
    
    syncManagementQuestionGroups() {
      console.log("[schedulers] Starting to sync question groups...");
      this.models.findAllQuestionGroups()
        .then((questionGroups) => {
          this.wordpress.listQuestionGroups()
            .then((wpQuestionGroups) => {
              
              const existingManagementIds = wpQuestionGroups.map((wpQuestionGroup) => {
                return wpQuestionGroup.id.toString();
              });
              
              const questionGroupsToRemove = _.filter(questionGroups, (questionGroup) => {
                return existingManagementIds.indexOf(questionGroup.originId) < 0;
              });
              
              for (let i = 0; i < questionGroupsToRemove.length; i++) {
                this.models.archiveQuestionGroup(questionGroupsToRemove[i].id);
              }
              
              wpQuestionGroups.forEach((questionGroup) => {
                this.pakkasmarjaBerriesUtils.updateOrCreateQuestionGroup(questionGroup, true);
              });
            });
        });
    }
    
    start() {
      this.syncManagementNewsArticlesInterval = setInterval(() => {
        this.syncManagementNewsArticles();
      }, 60 * 1000 * 15);
      
      //TODO: implement archiving system for threads
      /**
      this.syncManagementChatThreadsInterval = setInterval(() => {
        this.syncManagementChatThreads();
      }, 60 * 1000);
      
      this.syncManagementQuestionGroupsInterval = setInterval(() => {
        this.syncManagementQuestionGroups();
      }, 60 * 1000); **/
    }
    
  }
  
  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const pakkasmarjaBerriesUtils = imports['pakkasmarja-berries-utils'];
    const scheluder = new PakkasmarjaBerriesScheluders(logger, wordpress, models, pakkasmarjaBerriesUtils);
    
    register(null, {
      'pakkasmarja-berries-scheluders': scheluder
    });
  };
  
})();