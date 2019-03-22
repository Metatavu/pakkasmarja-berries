(() => {
  "use strict";

  const fetch = require("node-fetch");
  const config = require(__dirname + "/../../config").config;
  const fs = require("fs").promises;
  const uuid = require("uuid4");
  const WP_PATH_SEPARATOR = "/images/wordpress/";

  /**
   * Returns chat messages with image content
   * 
   * @param query query interface 
   */
  const getImageMessages = async (query) => {
    return (await query.sequelize.query("SELECT id, contents FROM Messages where contents like '%<img%'"))[0];
  };

  /**
   * Returns chat threads with image
   * 
   * @param {Sequelize.query} query query interface
   */
  const getThreadsWithImages = async (query) => {
    return (await query.sequelize.query("select id, imageUrl from Threads where imageUrl is not null"))[0];
  };

  /**
   * Returns chat groups with image
   * 
   * @param {Sequelize.query} query query interface
   */
  const getChatGroupsWithImages = async (query) => {
    return (await query.sequelize.query("select id, imageUrl from ChatGroups where imageUrl is not null"))[0];
  };

  /**
   * Returns news articles with image
   * 
   * @param {Sequelize.query} query query interface
   */
  const getNewsArticlesWithImages = async (query) => {
    return (await query.sequelize.query("select id, imageUrl from NewsArticles where imageUrl is not null"))[0];
  };

  /**
   * Finds message attachment by id
   * 
   * @param {Sequelize.query} query query interface
   * @param {string} id message attachment id
   */
  const getMessageAttachment = async (query, id) => {
    return (await query.sequelize.query(`SELECT contentType, contents FROM MessageAttachments WHERE id = ${id}`))[0];
  };

  /**
   * Updates messages image and contents
   * 
   * @param {Sequelize.query} query query interface
   * @param {number} id message id
   * @param {string} image message image url
   * @param {string} contents message contents
   */
  const updateMessageImageAndContents = async (query, id, image, contents) => {
    return (await query.sequelize.query(`UPDATE Messages SET image = '${image}', contents = '${contents}' WHERE id = ${id}`));
  };

  /**
   * Updates thread image
   * 
   * @param {Sequelize.query} query query interface
   * @param {number} id id
   * @param {string} image image url
   */
  const updateThreadImage = async (query, id, image) => {
    return (await query.sequelize.query(`UPDATE Threads SET imageUrl = '${image}' WHERE id = ${id}`));
  };

  /**
   * Updates news article image
   * 
   * @param {Sequelize.query} query query interface
   * @param {number} id id
   * @param {string} image image url
   */
  const updateNewsArticleImage = async (query, id, image) => {
    return (await query.sequelize.query(`UPDATE NewsArticles SET imageUrl = '${image}' WHERE id = ${id}`));
  };

  /**
   * Updates chat group image
   * 
   * @param {Sequelize.query} query query interface
   * @param {number} id id
   * @param {string} image image url
   */
  const updateChatGroupImage = async (query, id, image) => {
    return (await query.sequelize.query(`UPDATE ChatGroups SET imageUrl = '${image}' WHERE id = ${id}`));
  };

  /**
   * Resolves image storage folder
   */
  const getImageFolder = () => {
    let path = config().uploadDirectory;
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return path;
  };

  /**
   * Returns server base url for the client
   */
  const getBaseUrl = () => {
    const host = config().client.server.host;
    const secure = config().client.server.secure;
    const port = config().client.server.port;
    const protocol = secure ? "https" : "http";
    return `${protocol}://${host}:${port}`;
  };

  /**
   * Resolves file extension
   * 
   * @param {string} contentType content type
   */
  const getFileExtension = (contentType) => {
    switch (contentType) {
      case "image/jpeg":
      case "image/jpg":
        return ".jpg";
      case "image/png":
        return ".png";
      default:
        return "";
    }
  };

  /**
   * Extracts image url from chat message
   * 
   * @param {chatMessage} message 
   */
  const getImageUrlFromMessage = (message) => {
    const contents = message.contents;
    const match = /src="([.a-zA-Z0-9:/-]*)"/gmi.exec(contents);
    if (!match) {
      return null;
    }
    if (match[1]) {
      return match[1];
    }

    return null;
  };

  /**
   * Migrates single chat message
   * 
   * @param {Sequelize.query} query query interface
   * @param {chatMessage} message message to migrate
   */
  const migrateChatMessage = async(query, message) => {
    const imageUrl = getImageUrlFromMessage(message);
    if (!imageUrl) {
      //Image not found, no need to migrate
      return;
    }
    
    const attachmentId = imageUrl.substr(imageUrl.lastIndexOf("/") + 1);
    const attachment = await getMessageAttachment(query, attachmentId);
    const filename = `${uuid()}${getFileExtension(attachment[0].contentType)}`;
    await fs.writeFile(`${getImageFolder()}/${filename}`, attachment[0].contents);
    const fileUrl = `${getBaseUrl()}/files/${filename}`;
    await updateMessageImageAndContents(query, message.id, fileUrl, "");
  };

  const downloadWordpressImage = async(imageDbUrl) => {
    const imagePath = imageDbUrl.substr(imageDbUrl.lastIndexOf(WP_PATH_SEPARATOR) + WP_PATH_SEPARATOR.length);
    const contentUrl = config().wordpress["content-url"];
    const url = `${contentUrl}/${imagePath}`;
    const res = await fetch(url);
    return res.arrayBuffer();
  };

  /**
   * Migrates single thread
   * 
   * @param {Sequelize.query} query query interface
   * @param {chatThread} thread thread to migrate
   */
  const migrateThread = async (query, thread) => {
    const imageDbUrl = thread.imageUrl;
    const extension = imageDbUrl.indexOf(".") > -1 ? imageDbUrl.substr(imageDbUrl.lastIndexOf(".")) : "";
    const filename = `${uuid()}${extension}`;
    const buffer = await downloadWordpressImage(imageDbUrl);
    await fs.writeFile(`${getImageFolder()}/${filename}`, Buffer.from(buffer));
    const fileUrl = `${getBaseUrl()}/files/${filename}`;
    await updateThreadImage(query, thread.id, fileUrl);
  };

  /**
   * Migrates single news article
   * 
   * @param {Sequelize.query} query query interface
   * @param {newsArticle} newsArticle news article to migrate
   */
  const migrateNewsArticle = async (query, newsArticle) => {
    const imageDbUrl = newsArticle.imageUrl;
    const extension = imageDbUrl.indexOf(".") > -1 ? imageDbUrl.substr(imageDbUrl.lastIndexOf(".")) : "";
    const filename = `${uuid()}${extension}`;
    const buffer = await downloadWordpressImage(imageDbUrl);
    await fs.writeFile(`${getImageFolder()}/${filename}`, Buffer.from(buffer));
    const fileUrl = `${getBaseUrl()}/files/${filename}`;
    await updateNewsArticleImage(query, newsArticle.id, fileUrl);
  };

  /**
   * Migrates single chat groups
   * 
   * @param {Sequelize.query} query query interface
   * @param {chatGroup} chatGroup chat group to migrate
   */
  const migrateChatGroup = async (query, chatGroup) => {
    const imageDbUrl = chatGroup.imageUrl;
    const extension = imageDbUrl.indexOf(".") > -1 ? imageDbUrl.substr(imageDbUrl.lastIndexOf(".")) : "";
    const filename = `${uuid()}${extension}`;
    const buffer = await downloadWordpressImage(imageDbUrl);
    await fs.writeFile(`${getImageFolder()}/${filename}`, Buffer.from(buffer));
    const fileUrl = `${getBaseUrl()}/files/${filename}`;
    await updateChatGroupImage(query, chatGroup.id, fileUrl);
  };

  module.exports = {

    up: async (query, Sequelize) => {
      await query.changeColumn("Messages", "contents", { type: Sequelize.TEXT, allowNull: true });
      await query.addColumn("Messages", "image", { type: Sequelize.TEXT, allowNull: true } );

      const imageMessages = await getImageMessages(query);
      for (let i = 0; i < imageMessages.length; i++) {
        await migrateChatMessage(query, imageMessages[i]);
      }

      const imageThreads = await getThreadsWithImages(query);
      for (let i = 0; i < imageThreads.length; i++) {
        await migrateThread(query, imageThreads[i]);
      }

      const imageNewsArticles = await getNewsArticlesWithImages(query);
      for (let i = 0; i < imageNewsArticles.length; i++) {
        await migrateNewsArticle(query, imageNewsArticles[i]);
      }

      const imageChatGroups = await getChatGroupsWithImages(query);
      for (let i = 0; i < imageChatGroups.length; i++) {
        await migrateChatGroup(query, imageChatGroups[i]);
      }

      await query.dropTable("MessageAttachments");
    }

  };

})();