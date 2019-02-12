import * as fs from "fs";
import * as FCM from "fcm-push";
import * as config from "nconf";
import uuid from "uuid4";
import { getLogger, Logger } from "log4js";

export default new class PushNotifications {

  private logger: Logger;
  private fcm: any;
  
  constructor () {
    this.logger = getLogger();
    this.fcm = new FCM(config.get("firebase:server-key"));
  }
  
  sendPushNotification(to: string, title: string, body: string, sound: boolean) {
    const mode = config.get("mode");
    if (mode !== "PRODUCTION") {
      if (mode === "TEST") {
        const mockFolder = config.get("pushNotification:mockFolder");
        const outbox = `${mockFolder}/outbox`;

        const outboxFolders = outbox.split("/");
        const parents = [];

        while (outboxFolders.length) {
          const folder = outboxFolders.shift();
          const path = `${parents.join("/")}/${folder}`;

          if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
          }

          parents.push(folder);
        }

        fs.writeFileSync(`${outbox}/${uuid()}`, JSON.stringify({to: to, title: title, body: body, sound: sound ? "default" : "silent" }));
      } else {
        this.logger.warn(`Skipping push notification because server is running in ${mode} mode`);
      }
      
      return;
    }

    const notificationSettings = {
      title: title,
      body: body,
      sound: sound ? "default" : "silent"
    };
    
    const message = {
      to: `/topics/${to}`,
      notification: notificationSettings
    };
    
    this.fcm.send(message)
      .then((response: string) => {
        this.logger.info(`Push notification sent with message ${response}`);
      })
      .catch((err: Error) => {
        this.logger.info(`Push notification sending failed`, err);
      });
  }
  
}