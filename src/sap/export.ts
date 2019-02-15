export interface SAPExport {
  SAP: SAPExportRoot
}

export interface SAPExportRoot {
  Contracts: {
    Contracts: SAPExportContract[]
  },
  ItemGroups: {
    ItemGroup: SAPExportItemGroup[]
  },
  DeliveryPlaces: {
    DeliveryPlaces: SAPExportDeliveryPlace[]
  }
}

export interface SAPExportItemGroup {
  ItemGroupCode: number,
  ItemGroupName: string
}

export interface SAPExportDeliveryPlace {
  PlaceCode: string,
  PlaceName: string
}

export interface SAPExportBusinessPartner {
  CardType: string,
  CardCode: string,
  CardName: string,
  UserName: string,
  Phone1: string,
  Phone2: string,
  Email: string,
  BillStreet: string,
  BillZipCode: string,
  BillCity: string,
  ShipStreet: string,
  ShipZipCode: string,
  ShipCity: string,
  IBAN: string,
  BIC: string,
  FederalTaxID: string,
  VatLiable: string,
  Audit: string,
  Muu: string,
  [propName: string]: string
}

export interface SAPExportContract {
  ContractId: string,
  ContractNumber: string,
  CardCode: string,
  CardName: string,
  Year: string,
  PlaceCode: string,
  PlaceName: string,
  ContractLines: {
    ContractLine: SAPExportContractLine[]
  }
}

export interface SAPExportContractLine {
  CardCode: string,
  ItemGroupCode: string,
  ContractQuantity: string,
  DeliveredQuantity: string,
  PlaceCode: string
}