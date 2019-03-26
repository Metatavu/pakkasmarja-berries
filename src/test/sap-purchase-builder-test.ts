import * as fs from "fs";
import * as test from "blue-tape";
import PurchaseMessageBuilder from "../sap/purchase-builder";
import xml from "./xml";

const testDataDir = `${__dirname}/../../src/test/data/`;

test("Test SAP purchase builder", async (t) => {

  const builder = new PurchaseMessageBuilder();

  builder.setPurchaseReceiptHeader({
    DocDate: 20190222,
    CardCode: 301024,
    Comments: "",
    WarehouseCode: "01",
    SalesPersonCode: 3
  });

  builder.setTransferHeader({
    CardCode: 301024,
    DocDate: 20190222,
    Comments: "",
    WarehouseCode: "100",
    FromWarehouseCode: "100",
    SalesPersonCode: 3
  });

  builder.addPurchaseReceiptLine({
    ItemCode: 304111,
    Quantity: "1320.000",
    Price: "3.200",
    UnitPrice: "3.200",
    FreeText: ""
  });

  builder.addTransferLine({
    ItemCode: 302601,
    Quantity: "200",
    BinAllocations: [
      {
        BinAbsEntry: 2,
        BinActionType: "batToWarehouse",
        Quantity: "200"
      }, {
        BinAbsEntry: 3,
        BinActionType: "batFromWarehouse",
        Quantity: "200"
      }
    ]
  });

  builder.addTransferLine({
    ItemCode: 302602,
    Quantity: "100",
    BinAllocations: [
      {
        BinAbsEntry: 2,
        BinActionType: "batToWarehouse",
        Quantity: "100"
      }, {
        BinAbsEntry: 3,
        BinActionType: "batFromWarehouse",
        Quantity: "100"
      }
    ]
  });

  xml.assertEquals(t, builder.buildXML(), fs.readFileSync(`${testDataDir}/SAP-PurchaseReceipt.xml`, "utf-8"));
});
