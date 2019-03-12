import * as _ from "lodash";
import mqtt, { OnMessageCallback } from "../mqtt";

/**
 * MQTT utility class for tests
 */
export default new class Mqtt {

  private onMessageHandler: OnMessageCallback;
  private messages: any[] = [];

  /**
   * Constructor
   */
  constructor() {
    this.onMessageHandler = this.onMessage.bind(this);
  }

  /**
   * Subscribes MQTT topic
   * 
   * @param subtopic subtopic
   */
  public async subscribe(subtopic: string) {
    await mqtt.reconnect();
    this.messages = [];
    await mqtt.subscribe(subtopic, this.onMessageHandler);
  }

  /**
   * Unsubscribes from MQTT topic
   * 
   * @param subtopic subtopic
   */
  public async unsubscribe(subtopic: string) {
    mqtt.unsubscribe(subtopic, this.onMessageHandler);
    await mqtt.disconnect();
  }

  /**
   * Waits for message count to be given count and returns messages
   * 
   * @param count count
   * @returns messages
   */
  public async expectMessage(expected: any) {
    const timeout = (new Date().getTime() + 5000);
    do {
      const result = await this.expectMessageWithDelay(expected);
      
      if (result) {
        return true;
      }

    } while (timeout > (new Date().getTime()));

    const messages = this.getMessages();
    throw new Error(`Timeout, expected ${JSON.stringify(expected)}, got: ${JSON.stringify(messages)}`);
  }

  /**
   * Retrieves messages after specified time
   * @returns promise for messages
   */
  private expectMessageWithDelay(expected: any): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        
        for (let i = 0; i < this.messages.length; i++) {
          if (_.isEqual(expected, this.messages[i])) {
            return resolve(true);
          }
        } 

        resolve(false);
      }, 100);
    });
  }

  /**
   * Returns list of received messages
   * @returns messages
   */
  private getMessages(): any[] {
    return this.messages;
  }

  /**
   * Message handler
   * 
   * @param message message
   */
  private onMessage(message: any) {
    this.messages.push(message);
  }
  
}