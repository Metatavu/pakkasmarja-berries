import * as xmlbuilder from "xmlbuilder";

/**
 * Interface describing purchase receipt header 
 */
export interface PurchaseReceiptHeader {
  DocDate: number,
  CardCode: number,
  Comments: string,
  WarehouseCode: string,
  SalesPersonCode: number,
}

/**
 * Interface describing purchase receipt header 
 */
export interface PurchaseReceiptLine {
  ItemCode: number,
  Quantity: string,
  Price: string,
  UnitPrice: string,
  FreeText: string,
}

/**
 * Interface describing a purchase receipt
 */
export interface PurchaseReceipt {
  Header: PurchaseReceiptHeader,
  Lines: PurchaseReceiptLine[]
}

/**
 * Interface describing transer header 
 */
export interface TransferHeader {
  DocDate: number,
  CardCode: number,
  Comments: string,
  WarehouseCode: string,
  FromWarehouseCode: string
  SalesPersonCode: number,
}

/**
 * Interface describing purchase receipt header 
 */
export interface TransferLineBinAllocation {
  BinAbsEntry: number,
  Quantity: string,
  BinActionType: "batToWarehouse" | "batFromWarehouse",
}

/**
 * Interface describing purchase receipt header 
 */
export interface TransferLine {
  ItemCode: number,
  Quantity: string,
  BinAllocations: TransferLineBinAllocation[]
}

/**
 * Interface describing a purchase receipt
 */
export interface Transfer {
  Header: TransferHeader,
  Lines: TransferLine[]
}

/**
 * Builder class for purchase XML messages
 */
export default class PurchaseMessageBuilder {

  private PurchaseReceipt: PurchaseReceipt = {
    Header: {
      CardCode: 0,
      Comments: "",
      DocDate: 20200101,
      SalesPersonCode: 0,
      WarehouseCode: "0"
    },
    Lines: []
  };

  private Transfer: Transfer = {
    Header: {
      DocDate: 20200101,
      Comments: "",
      CardCode: 0,
      FromWarehouseCode: "0",
      SalesPersonCode: 0,
      WarehouseCode: "0"
    },
    Lines: [ ]
  };

  /**
   * Ses purchse receipt header
   * 
   * @param header header
   * @return builder instance
   */
  public setPurchaseReceiptHeader(header: PurchaseReceiptHeader): PurchaseReceiptHeader {
    return this.PurchaseReceipt.Header = header;
  }

  /**
   * Adds purchse receipt line
   * 
   * @param line line
   * @return builder instance
   */
  public addPurchaseReceiptLine(line: PurchaseReceiptLine): PurchaseReceiptLine {
    this.PurchaseReceipt.Lines.push(line);
    
    return line;
  } 

  /**
   * Sets transfer header
   * 
   * @param header header
   * @return builder instance
   */
  public setTransferHeader(header: TransferHeader): TransferHeader {
    return this.Transfer.Header = header;
  }

  /**
   * Adds transfer line
   * 
   * @param line line
   * @return line
   */
  public addTransferLine(line: TransferLine): TransferLine {
    this.Transfer.Lines.push(line);
    return line;
  }

  /**
   * Builds XML message as string
   * 
   * @return XML message
   */
  public buildXML(): string {
    const root = xmlbuilder.create("SAP");

    this.buildPurchaseReceipt(root);
    this.buildTransfer(root);
    
    return root.end({ pretty: true});
  }

  /**
   * Builds PurchaseReceipt node into the output XML DOM
   * 
   * @param root root node
   */
  private buildPurchaseReceipt(root: xmlbuilder.XMLElementOrXMLNode) {
    const node = root.ele("PurchaseReceipt");
    const header = node.ele("Header");

    header.ele("DocDate", this.PurchaseReceipt.Header.DocDate);
    header.ele("CardCode", this.PurchaseReceipt.Header.CardCode);
    header.ele("Comments", this.PurchaseReceipt.Header.Comments);
    header.ele("WarehouseCode", this.PurchaseReceipt.Header.WarehouseCode);
    header.ele("SalesPersonCode", this.PurchaseReceipt.Header.SalesPersonCode);

    const lines = node.ele("Lines");

    this.PurchaseReceipt.Lines.forEach((purchaseReceiptLine) => {
      const line = lines.ele("Line");
      line.ele("ItemCode", purchaseReceiptLine.ItemCode);
      line.ele("Quantity", purchaseReceiptLine.Quantity);
      line.ele("Price", purchaseReceiptLine.Price);
      line.ele("UnitPrice", purchaseReceiptLine.UnitPrice);
      line.ele("FreeText", purchaseReceiptLine.FreeText);
    });
  }

  /**
   * Builds Transfer node into the output XML DOM
   * 
   * @param root root node
   */
  private buildTransfer(root: xmlbuilder.XMLElementOrXMLNode) {
    const node = root.ele("Transfer");
    const header = node.ele("Header");

    header.ele("DocDate", this.Transfer.Header.DocDate);
    header.ele("CardCode", this.Transfer.Header.CardCode);
    header.ele("Comments", this.Transfer.Header.Comments);
    header.ele("WarehouseCode", this.Transfer.Header.WarehouseCode);
    header.ele("FromWarehouseCode", this.Transfer.Header.WarehouseCode);
    header.ele("SalesPersonCode", this.Transfer.Header.SalesPersonCode);

    const lines = node.ele("Lines");

    this.Transfer.Lines.forEach((transferLine) => {
      const line = lines.ele("Line");
      line.ele("ItemCode", transferLine.ItemCode);
      line.ele("Quantity", transferLine.Quantity);

      const binAllocations = line.ele("BinAllocations");

      transferLine.BinAllocations.forEach((binAllocation) => {
        const binAllocationLine = binAllocations.ele("Line");
        binAllocationLine.ele("BinAbsEntry", binAllocation.BinAbsEntry);
        binAllocationLine.ele("Quantity", binAllocation.Quantity);
        binAllocationLine.ele("BinActionType", binAllocation.BinActionType);
      });
    });
  }

}