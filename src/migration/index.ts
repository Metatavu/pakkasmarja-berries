import * as fs from "fs";
import * as Umzug from "umzug"; 
import * as Sequelize from "sequelize";
import { config } from "../config";

export default class Migration {

  private sequelize: Sequelize.Sequelize;

  constructor(sequelize: Sequelize.Sequelize) {
    this.sequelize = sequelize;
  }
  
  /**
   * Runs all pending database migrations 
   * 
   * @return {Promise} Promise for migrations 
   */
  public migrationsUp () {   
    return this.obtainMigrationLock()
      .then((locked) => {
        if (locked) {
          const umzug = new Umzug({
            storage: "sequelize",
            storageOptions: {
              sequelize: this.sequelize
            },
            migrations: {
              params: [
                this.sequelize.getQueryInterface(),
                Sequelize
              ],
              path: `${__dirname}/migrations/`
            }
          });
    
          return umzug.up().then((migrations) => {
            return this.releaseMigrationLock().then(() => {
              return migrations;
            });
          })
        } else {
          return this.waitMigrationLock()
            .then(() => {
              return [];
            });
        }
      });
  }

  /**
   * Obtains migration lock. Lock can be created by this worker or the lock can already be present. 
   * 
   * @return {Promise} Promise that resolves with whether lock was created by this worker
   */
  private obtainMigrationLock() {
    const lockFile = config().migrations["lock-file"];

    return new Promise((resolve, reject) => {
      fs.open(lockFile, "wx", (err) => {
        if (err) {
          if (err.code === "EEXIST") {
            resolve(false);
          } else {
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Releases migration lock
   * 
   * @return {Promise} Promise for removed lock file 
   */
  private releaseMigrationLock() {
    const lockFile = config().migrations["lock-file"];

    return new Promise((resolve, reject) => {
      fs.unlink(lockFile, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Waits migration lock
   * 
   * @return {Promise} Promise for released lock 
   */
  private waitMigrationLock() {
    const lockFile = config().migrations["lock-file"];

    return new Promise((resolve, reject) => {
      fs.exists(lockFile, (exists) => {
        if (exists) {
          setTimeout(() => {
            this.waitMigrationLock()
              .then(() => {
                resolve();
              })
              .catch(() => {
                reject();
              });
          }, 300);
        } else {
          resolve();
        }
      });
    }); 
  }
}