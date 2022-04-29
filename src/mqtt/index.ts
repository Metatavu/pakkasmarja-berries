import * as _ from "lodash";
import * as mqtt from "mqtt";
import { config } from "../config";
import { IClientOptions } from "mqtt";
import { getLogger, Logger } from "log4js";

/**
 * Message subscribe callback handler
 */
export type OnMessageCallback = (message: any) => void;

/**
 * Class that handles MQTT connection
 */
export default new class Mqtt {

  private logger: Logger = getLogger();
  private client: mqtt.MqttClient;
  private subscribers: Map<String, Array<OnMessageCallback>>;
  private connecting: boolean;

  /**
   * Constructor
   */
  constructor () {
    this.connecting = false;
    this.subscribers = new Map();
  }

  /**
   * Publishes a message
   *
   * @param subtopic subtopic
   * @param message message
   * @returns promise for sent package
   */
  public publish(subtopic: string, message: any): Promise<mqtt.Packet | undefined> {
    return new Promise((resolve, reject) => {
      const topic = `${config().mqtt.topicPrefix}${config().mqtt.topic}/${subtopic}/`;
      this.client.publish(topic, JSON.stringify(message), (error?: Error, packet?: mqtt.Packet) => {
        if (error) {
          reject(error);
        } else {
          resolve(packet);
        }
      });
    });
  }

  /**
   * Subscribes to given subtopic
   *
   * @param subtopic subtopic
   * @param onMessage message handler
   */
  public subscribe(subtopic: string, onMessage: OnMessageCallback) {
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    topicSubscribers.push(onMessage);
    this.subscribers.set(subtopic, topicSubscribers);
  }

  /**
   * Unsubscribes from given subtopic
   *
   * @param subtopic subtopic
   * @param onMessage message handler
   */
  public unsubscribe(subtopic: string, onMessage: OnMessageCallback) {
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    this.subscribers.set(subtopic, topicSubscribers.filter((topicSubscriber) => {
      return topicSubscriber !== onMessage;
    }));
  }

  /**
   * Reconnects to MQTT server
   */
  public async reconnect() {
    if (this.client && this.client.connected) {
      await this.disconnect();
    }

    return this.connect();
  }

  /**
   * Connects to the MQTT server
   */
  public async connect() {
    await this.waitConnecting();
    return await this.doConnect();
  }

  /**
   * Waits for connecting status
   */
  public async waitConnecting() {
    const timeout = (new Date().getTime() + 60000);
    do {
      if (await this.waitConnectingDelayed()) {
        return null;
      }
    } while (timeout > (new Date().getTime()));

    throw new Error(`Timeout`);
  }

  /**
   * Disconnects from the server
   */
  public async disconnect() {
    return new Promise<void>((resolve) => {
      if (this.client && this.client.connected) {
        this.client.end(false, resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Waits for connection connecting
   *
   * @returns promise for connection not connecting
   */
  private waitConnectingDelayed(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(!this.connecting);
      }, 100);
    });
  }

  /**
   * Connects the MQTT client
   *
   * @returns promise for connection
   */
  private doConnect() {
    return new Promise<void>((resolve) => {
      if (this.client && this.client.connected) {
        return resolve();
      }

      const url = (config().mqtt.secure ? "wss://" : "ws://") + config().mqtt.host + ":" + config().mqtt.port + (config().mqtt.path || "");
      const options: IClientOptions = {
        host: config().mqtt.host,
        port: config().mqtt.port,
        keepalive: 30,
        username: config().mqtt.username,
        password: config().mqtt.password
      };

      this.client = mqtt.connect(url, options);
      this.client.subscribe(`${config().mqtt.topicPrefix}${config().mqtt.topic}${config().mqtt.topicPostfix}`);
      this.client.on("close", this.onClientClose.bind(this));
      this.client.on("offline", this.onClientOffline.bind(this));
      this.client.on("error", this.onClientError.bind(this));
      this.client.on("message", this.onClientMessage.bind(this));

      this.client.once("connect", () => {
        this.onClientConnect();
        resolve();
      });

    });
  }

  /**
   * Handles client connect event
   */
  private onClientConnect() {
    this.logger.info("MQTT connection open");
  }

  /**
   * Handles client close event
   */
  private onClientClose() {
    this.logger.info("MQTT connection closed");
  }

  /**
   * Handles client offline event
   */
  private onClientOffline() {
    this.logger.info("MQTT connection offline");
  }

  /**
   * Handles client error event
   */
  private onClientError(error: Error) {
    this.logger.error("MQTT connection error", error);
  }

  /**
   * Handles client message event
   */
  private onClientMessage(topic: string, payload: Buffer, packet: mqtt.Packet) {
    const topicStripped = _.trim(topic, "/");
    const subtopicIndex = topicStripped.lastIndexOf("/") + 1;
    const subtopic = topicStripped.substr(subtopicIndex);
    const message = JSON.parse(payload.toString());
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    topicSubscribers.forEach((topicSubscriber: OnMessageCallback) => {
      topicSubscriber(message);
    });
  }

}