import * as nconf from "nconf";

nconf
  .argv()
  .env({
    separator: "__",
    lowerCase: true,
    parseValues: true,
    transform: (obj: { key: string }) => {
      obj.key = obj.key.replace(/base[uU]rl/g, "baseUrl");
      obj.key = obj.key.replace(/client[iI]d/g, "clientId");
      obj.key = obj.key.replace(/client[sS]ecret/g, "clientSecret");
      obj.key = obj.key.replace(/([^_])_([^_])/g, "$1-$2");
      return obj;
    }
  })
  .file({file: __dirname + "/../../config.json"})
  .defaults(require( __dirname + "/../../default-config.json"));

/**
 * Cache settings
 */
export interface Cache {
  enabled: boolean;
  "expire-time": number;
}

/**
 * Mqtt settings
 */
export interface Mqtt {
  host: string;
  port: number;
  path?: string;
  secure: boolean;
  topic: string;
  topicPrefix: string;
  topicPostfix: string;
  username?: string;
  password?: string;
}

/**
 * Contract document status task settings
 */
export interface ContractDocumentStatus {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * Contract document status batch task settings
 */
export interface ContractDocumentStatusBatch {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * SAP contact update task settings
 */
export interface SapContactUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * SAP contract delivered quantity task settings
 */
export interface SapContractDeliveredQuantityUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * SAP contract update task settings
 */
export interface SapContractUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * SAP delivery place update task settings
 */
export interface SapDeliveryPlaceUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * SAP item group update task settings
 */
export interface SapItemGroupUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

/**
 * Task queues
 */
export interface Queues {
  contractDocumentStatus: ContractDocumentStatus;
  contractDocumentStatusBatch: ContractDocumentStatusBatch;
  sapContactUpdate: SapContactUpdate;
  sapContractDeliveredQuantityUpdate: SapContractDeliveredQuantityUpdate;
  sapContractUpdate: SapContractUpdate;
  sapDeliveryPlaceUpdate: SapDeliveryPlaceUpdate;
  sapItemGroupUpdate: SapItemGroupUpdate;
}

/**
 * Timed or user initiated tasks
 */
export interface Tasks {
  queues: Queues;
  tableName: string;
}

/**
 * Admin configuration for Keycloak
 */
export interface KeycloakAdminConfig {
  realm: string;
  baseUrl: string;
  username: string;
  password: string;
  grant_type: string;
  client_id: string;
  client_secret: string;
}

/**
 * General configuration for Keycloak
 */
export interface KeycloakConfig {
  realm: string;
  "bearer-only"?: boolean;
  "auth-server-url": string;
  "ssl-required": string;
  resource: string;
  "public-client"?: boolean;
  "confidential-port": number;
}

/**
 * Keycloak settings
 */
export interface Keycloak {
  admin: KeycloakAdminConfig;
  rest: KeycloakConfig;
  app: KeycloakConfig;
}

/**
 * Wordpress configuration
 */
export interface Wordpress {
  "api-url": string;
  username: string;
  password: string;
  "content-url": string;
}

/**
 * Firebase configuration
 */
export interface Firebase {
  "server-key": string;
}

/**
 * MySQL configuration
 */
export interface Mysql {
  host: string;
  database: string;
  username: string;
  password: string;
  port: string;
}

/**
 * HTML to PDF transformer command
 */
export interface Wkhtmltopdf {
  command: string;
}

/**
 * SAP Service Layer configuration
 */
export interface SAPServiceLayer {
  apiUrl: string;
  companyDb: string;
  username: string;
  password: string;
}

/**
 * General configuration for Keycloak
 */
export interface SAPImportFile {
  file: string;
  status: string;
}

/**
 * Categorization for SAP item groups
 */
export interface SAPItemGroupCategories {
  FROZEN: string[];
  FRESH: string[];
}

/**
 * Display names for SAP item group
 */
export interface SAPItemGroupDisplayNames {
  [key: string]: string;
}

/**
 * Pre-requisites for SAP item groups
 */
export interface SAPItemGroupPrerequisites {
  [key: string]: string;
}

/**
 * Minimum profit estimations for SAP item groups
 */
export interface SAPItemGroupMinimumProfitEstimation {
  [key: string]: number;
}

/**
 * Loanable SAP products
 */
export interface SAPLoanProducts {
  GRAY_BOX: string;
  RED_BOX: string;
}

/**
 * SAP settings
 */
export interface SAP {
  "import-files": SAPImportFile[];
  "item-group-categories": SAPItemGroupCategories;
  "item-group-display-names": SAPItemGroupDisplayNames;
  "item-group-prerequisites": SAPItemGroupPrerequisites;
  "item-group-minimum-profit-estimation": SAPItemGroupMinimumProfitEstimation;
  "xml-fileupload-path": string;
  "loanProductIds": SAPLoanProducts;
}

/**
 * Visma Sign settings
 */
export interface VismaSign {
  clientId: string;
  clientSecret: string;
  affiliateCode?: string;
}

/**
 * Mail service settings
 */
export interface Mail {
  api_key: string;
  domain: string;
  mockFolder?: string;
  sender: string;
}

/**
 * Error notification email addresses
 */
export interface ErrorNotifications {
  fresh: string[];
  frozen: string[];
}

/**
 * General notification info
 */
export interface Notifications {
  email: string;
  frozen: string;
  fresh: string;
  deliveries: string;
  errors: ErrorNotifications;
}

/**
 * General contact info
 */
export interface Contacts {
  notifications: Notifications;
}

/**
 * Push notification settings
 */
export interface PushNotification {
  mockFolder: string;
}

/**
 * Migration settings
 */
export interface Migrations {
  "lock-file": string;
}

/**
 * Client server configuration
 */
export interface ClientServerConfig {
  host: string;
  port: string;
  secure: boolean;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  server: ClientServerConfig;
}

/**
 * Server configuration
 */
export interface Config {
  mode: "PRODUCTION" | "TEST";
  port: number;
  "session-secret": string;
  cache: Cache;
  tasks: Tasks;
  keycloak: Keycloak;
  wordpress: Wordpress;
  firebase: Firebase;
  mysql: Mysql;
  wkhtmltopdf: Wkhtmltopdf;
  sap: SAP;
  sapServiceLayer: SAPServiceLayer;
  "visma-sign"?: VismaSign;
  mail: Mail;
  contacts?: Contacts;
  pushNotification: PushNotification;
  migrations: Migrations;
  mqtt: Mqtt;
  uploadDirectory: string;
  client: ClientConfig;
}

/**
 * Method for accessing server configuration
 */
export function config(): Config {
  return {
    ... nconf.get(),
    mail: {
      api_key: nconf.get("mail:api_key"),
      domain: nconf.get("mail:domain"),
      mockFolder: nconf.get("mail:mockFolder"),
      sender: nconf.get("mail:sender")
    }
  }
}