/**
 * SAP client config
 */
export interface SapConfig {
  apiUrl: string;
  companyDb: string;
  user: string;
  pass: string;
}

/**
 * SAP session data
 */
export interface SapSession {
  sessionId: string;
  routeId: string;
}

/**
 * SAP login request body
 */
export interface SapLoginRequestBody {
  CompanyDB: string;
  UserName: string;
  Password: string;
}

/**
 * Response of ListBusinessPartners request
 */
export interface ListBusinessPartnersResponse {
  "odata.metadata"?: string;
  value: SapBusinessPartner[];
  "odata.nextLink"?: string;
}

/**
 * SAP business partner
 */
export interface SapBusinessPartner {
  CardCode: string;
  CardType: string;
  CardName: string;
  CarForeignName: string;
  Phone1: string;
  Phone2: string;
  Email: string;
  BPAddresses: SapBPAddress[];
  BPBankAccounts: SapBPBankAccount[];
  FederalTaxID: string;
  VatLiable: VatLiableEnum;
  U_audit: string;
  U_muu: string;
  [key: string]: any;
}

/**
 * Sap business partner address
 */
export interface SapBPAddress {
  AddressType: SapAddressTypeEnum;
  Street: string;
  ZipCode: string;
  City: string;
}

/**
 * Sap business partner address type
 */
export enum SapAddressTypeEnum {
  BILLING = "bo_BillTo",
  SHIPPING = "bo_ShipTo"
}

/**
 * Sap business partner bank account
 */
export interface SapBPBankAccount {
  IBAN: string;
  BICSwiftCode: string;
}

/**
 * Enum for Sap business partner vatLiable options
 */
export enum VatLiableEnum {
  Y = "vLiable",
  N = "vExempted",
  EU = ""
}

/**
 * Response of ListItemGroups request
 */
export interface ListItemGroupsResponse {
  "odata.metadata"?: string;
  value: SapItemGroup[];
  "odata.nextLink"?: string;
}

/**
 * SAP item group
 */
export interface SapItemGroup {
  Number: number;
  GroupName: string;
}