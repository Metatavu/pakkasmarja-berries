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
  public async waitMessages(count: number) {
    const timeout = (new Date().getTime() + 5000);
    do {
      const messages = await this.waitMessagesDelayed();
      if (messages.length == count) {
        return messages;
      }
    } while (timeout > (new Date().getTime()));

    const messages = this.getMessages();
    throw new Error(`Timeout, expected ${count} got ${messages.length}. Messages: ${JSON.stringify(messages)}`);
  }

  /**
   * Retrieves messages after specified time
   * @returns promise for messages
   */
  private waitMessagesDelayed(): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getMessages());
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