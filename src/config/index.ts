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

console.log("defaults", require( __dirname + "/../../default-config.json"));

export interface Cache {
  enabled: boolean;
  "expire-time": number;
}

export interface ContractDocumentStatus {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface ContractDocumentStatusBatch {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface SapContactUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface SapContractDeliveredQuantityUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface SapContractUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface SapDeliveryPlaceUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface SapItemGroupUpdate {
  afterProcessDelay: number;
  concurrent: number;
  maxTimeout: number;
}

export interface Queues {
  contractDocumentStatus: ContractDocumentStatus;
  contractDocumentStatusBatch: ContractDocumentStatusBatch;
  sapContactUpdate: SapContactUpdate;
  sapContractDeliveredQuantityUpdate: SapContractDeliveredQuantityUpdate;
  sapContractUpdate: SapContractUpdate;
  sapDeliveryPlaceUpdate: SapDeliveryPlaceUpdate;
  sapItemGroupUpdate: SapItemGroupUpdate;
}

export interface Tasks {
  queues: Queues;
  tableName: string;
}

export interface KeycloakAdminConfig {
  realm: string;
  baseUrl: string,
  username: string,
  password: string,
  grant_type: string,
  client_id: string
}

export interface KeycloakConfig {
  realm: string;
  "bearer-only"?: boolean;
  "auth-server-url": string;
  "ssl-required": string;
  resource: string;
  "public-client"?: boolean;
  "confidential-port": number;
}

export interface Keycloak {
  admin: KeycloakAdminConfig;
  rest: KeycloakConfig;
  app: KeycloakConfig;
}

export interface Wordpress {
  "api-url": string;
  username: string;
  password: string;
  "content-url": string;
}

export interface Firebase {
  "server-key": string;
}

export interface Mysql {
  host: string;
  database: string;
  username: string;
  password: string;
  port: string;
}

export interface Wkhtmltopdf {
  command: string;
}

export interface SAPImportFile {
  file: string;
  status: string;
}

export interface SAPItemGroupCategories {
  FROZEN: string[];
  FRESH: string[];
}

export interface SAPItemGroupDisplayNames {
  [key: string]: string
}

export interface SAPItemGroupPrerequisites {
  [key: string]: string
}

export interface SAPItemGroupMinimumProfitEstimation {
  [key: string]: number
}

export interface SAP {
  "import-files": SAPImportFile[];
  "item-group-categories": SAPItemGroupCategories;
  "item-group-display-names": SAPItemGroupDisplayNames;
  "item-group-prerequisites": SAPItemGroupPrerequisites;
  "item-group-minimum-profit-estimation": SAPItemGroupMinimumProfitEstimation;
}

export interface VismaSign {
  clientId: string;
  clientSecret: string;
  affiliateCode?: string;
}

export interface Mail {
  api_key: string;
  domain: string;
  mockFolder?: string;
  sender: string;
}

export interface Notifications {
  email: string;
}

export interface Contacts {
  notifications: Notifications;
}

export interface PushNotification {
  mockFolder: string;
}

export interface Migrations {
  "lock-file": string;
}

export interface Config {
  mode: string;
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
  "visma-sign"?: VismaSign;
  mail: Mail;
  contacts?: Contacts;
  pushNotification: PushNotification
  migrations: Migrations
}

export function config(): Config {
  return nconf.get();
}