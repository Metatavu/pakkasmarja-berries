/**
 * Interface describing SAP client config
 */
export interface SapConfig {
  apiUrl: string;
  companyDb: string;
  username: string;
  password: string;
}

/**
 * Interface describing SAP session data
 */
export interface SapSession {
  sessionId: string;
  routeId: string;
}

/**
 * Interface describing SAP login request body
 */
export interface SapLoginRequestBody {
  CompanyDB: string;
  UserName: string;
  Password: string;
}

/**
 * Interface describing response of ListBusinessPartners request
 */
export interface ListBusinessPartnersResponse {
  "odata.metadata"?: string;
  value: SapBusinessPartner[];
  "odata.nextLink"?: string;
}

/**
 * Interface describing SAP business partner
 */
export interface SapBusinessPartner {
  CardCode: string | null;
  CardType: string | null;
  CardName: string | null;
  CardForeignName: string | null;
  Phone1: string | null;
  Phone2: string | null;
  EmailAddress: string | null;
  BPAddresses: SapBPAddress[];
  BPBankAccounts: SapBPBankAccount[];
  FederalTaxID: string | null;
  VatLiable: SapVatLiableEnum | null;
  U_audit: string | null;
  U_muu: string | null;
  [key: string]: any;
}

/**
 * Interface describing SAP business partner address
 */
export interface SapBPAddress {
  AddressType: SapAddressTypeEnum | null;
  Street: string | null;
  ZipCode: string | null;
  City: string | null;
}

/**
 * Enum for SAP business partner address type
 */
export enum SapAddressTypeEnum {
  BILLING = "bo_BillTo",
  SHIPPING = "bo_ShipTo"
}

/**
 * Interface describing SAP business partner bank account
 */
export interface SapBPBankAccount {
  IBAN: string | null;
  BICSwiftCode: string | null;
  [key: string]: string | null;
}

/**
 * Enum for SAP business partner vatLiable options
 */
export enum SapVatLiableEnum {
  Y = "vLiable",
  N = "vExempted",
  EU = "vEC"
}

/**
 * Interface describing response of ListItemGroups request
 */
export interface ListItemGroupsResponse {
  "odata.metadata"?: string;
  value: SapItemGroup[];
  "odata.nextLink"?: string;
}

/**
 * Interface describing SAP item group
 */
export interface SapItemGroup {
  Number: number | null;
  GroupName: string | null;
}

/**
 * Interface describing response of ListDeliveryPlaces request
 */
export interface ListDeliveryPlacesResponse {
  "odata.metadata"?: string;
  value: SapDeliveryPlace[];
  "odata.nextLink"?: string;
}

/**
 * Interface describing SAP Delivery place
 */
export interface SapDeliveryPlace {
  Code: string | null;
  Name: string | null;
}

/**
 * Interface describing response of ListContracts request
 */
export interface ListContractsResponse {
  "odata.metadata"?: string;
  value: SapContract[];
  "odata.nextLink"?: string;
}

/**
 * Interface describing SAP Contract
 */
export interface SapContract {
  AgreementNo: string | null;
  DocNum: string | null;
  BPCode: string | null;
  BPName: string | null;
  ContactPersonCode: number | null;
  StartDate: string | null;
  EndDate: string | null;
  TerminateDate: string | null;
  SigningDate: string | null;
  Status: SapContractStatusEnum | null;
  U_PFZ_Toi: string | null;
  BlanketAgreements_ItemsLines: SapContractLine[];
  [key: string]: any;
}

/**
 * Enum for SAP contract status
 */
export enum SapContractStatusEnum {
  TERMINATED = "asTerminated",
  APPROVED = "asApproved",
  ON_HOLD = "asOnHold",
  DRAFT = "asDraft"
}

/**
 * Interface describing SAP contract line
 */
export interface SapContractLine {
  ItemGroup: number | null;
  CumulativeQuantity: number | null;
  U_PFZ_ToiP: string | null;
}

/**
 * Interface describing SAP purchase delivery note
 */
export interface SapPurchaseDeliveryNote {
  DocObjectCode: SapDocObjectCodeEnum;
  DocDate: string | null;
  CardCode: string | null;
  Comments: string | null;
  SalesPersonCode: number | null;
  DocumentLines: SapPurchaseDeliveryNoteLine[];
}

/**
 * Enum for SAP document object code
 */
export enum SapDocObjectCodeEnum {
  PURCHASE_DELIVERY_NOTE = "oPurchaseDeliveryNotes",
}

/**
 * Interface describing SAP purchase delivery note line
 */
export interface SapPurchaseDeliveryNoteLine {
  ItemCode: string | null;
  Quantity: number | null;
  UnitPrice: number | null;
  WarehouseCode: string | null;
  U_PFZ_REF: string | null;
}

/**
 * Interface describing SAP stock transfer
 */
export interface SapStockTransfer {
  DocDate: string | null;
  CardCode: string | null;
  Comments: string | null;
  SalesPersonCode: number | null;
  FromWarehouse: string | null;
  ToWarehouse: string | null;
  StockTransferLines: SapStockTransferLine[];
}

/**
 * Interface describing SAP stock transfer line
 */
export interface SapStockTransferLine {
  ItemCode: string | null;
  Quantity: number | null;
  WarehouseCode: string | null;
  FromWarehouseCode: string | null;
  DocumentLinesBinAllocations: BinAllocation[];
}

/**
 * Interface describing bin allocation
 */
export interface BinAllocation {
  BinAbsEntry: number | null;
  Quantity: number | null;
  BinActionType: BinActionTypeEnum | null;
}

/**
 * Enum for bin action type
 */
export enum BinActionTypeEnum {
  TO_WAREHOUSE = "batToWarehouse",
  FROM_WAREHOUSE = "batFromWarehouse"
}