import DeliveryLoansService from "../api/deliveryLoans.service";
import { DeliveryLoan } from "../model/deliveryLoan";
import { Request, Response } from "express";
import userManagement, { UserProperty } from "../../user-management";
import { createStackedReject, logReject } from "../../utils";
import { getLogger } from "log4js";
import ApplicationRoles from "../application-roles";
import { BinActionType, HttpError, SapStockTransfer, SapStockTransferLine, SapStockTransferLineBinAllocation } from "../../generated/erp-services-client/api";
import moment = require("moment");
import ErpClient from "../../erp/client";
import { config } from "../../config";
import _ = require("lodash");
import { DeliveryLoanItem } from "../model/models";

/**
 * Implementation for Deliveries REST service
 */
export default class DeliveryLoansServiceImpl extends DeliveryLoansService {

  /**
   * @inheritdoc
   */
  async createDeliveryLoan(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_DELIVERIES)) {
      return this.sendForbidden(res, "You have no permission to create delivery loans");
    }

    const contactId: string = req.body.contactId;
    const comment: string = req.body.comment;
    const loans: DeliveryLoan[] = req.body.loans;

    try {
      const userId = this.getLoggedUserId(req);
      if (!userId) {
        return this.sendBadRequest(res, "No userId found from request");
      }

      const user = await userManagement.findUser(userId);
      if (!user) {
        return this.sendBadRequest(res, `User with ID ${userId} not found`);
      }

      const salesPersonCode = userManagement.getSingleAttribute(user, UserProperty.SAP_SALES_PERSON_CODE);
      if (!salesPersonCode) {
        return this.sendBadRequest(res, `SAP sales person code not found from user ${user.username || user.email}`);
      }

      if (!contactId) {
        return this.sendBadRequest(res, "Contact ID not found from request body");
      }

      const contact = await userManagement.findUser(contactId);
      if (!contact) {
        return this.sendBadRequest(res, `Contact not found with contact ID ${contactId}`);
      }

      const businessPartnerCode = userManagement.getSingleAttribute(contact, UserProperty.SAP_BUSINESS_PARTNER_CODE);
      if (!businessPartnerCode) {
        return this.sendBadRequest(res, `Sap ID not found from user ${contact.username || contact.email}`);
      }

      if (!Array.isArray(loans)) {
        return this.sendBadRequest(res, "Invalid request body");
      }

      if (!loans.length) {
        return this.sendBadRequest(res, "No delivery loans found from request body");
      }

      for (const { item, loaned, returned } of loans) {
        if (!item || loaned === undefined || returned === undefined) {
          return this.sendBadRequest(res, "Invalid delivery loan found from request body");
        }
      }

      const stockTransfer = await this.createSapStockTransfer(
        loans,
        Number(businessPartnerCode),
        Number(salesPersonCode),
        new Date(),
        [ comment ]
      );

      res.status(200).send(this.translateStockTransfer(stockTransfer));
    } catch (error) {
        logReject(createStackedReject("Delivery loan could not be created", error), getLogger());
        this.sendInternalServerError(res, "Delivery loan could not be created");
    }
  }

    /**
   * Create SAP stock transfer
   *
   * @param loans loans
   * @param businessPartnerCode business partner code
   * @param salesPersonCode sales person code
   * @param docDate doc date
   * @param comments comments
   * @return promise of successful creation
   */
  private createSapStockTransfer = async (
    loans: DeliveryLoan[],
    businessPartnerCode: number,
    salesPersonCode: number,
    docDate: Date,
    comments: string[]
  ): Promise<SapStockTransfer> => {
    try {
      if (!loans.length) {
        throw new Error("No loans");
      }

      const stockTransferLines = this.translateLoans(loans);

      if (stockTransferLines.length < 1) {
        throw new Error(`Stock transfer lines could not be constructed from following loans: ${JSON.stringify(loans, null, 2)}`);
      }

      const stockTransfersApi = await ErpClient.getStockTransfersApi();
      const result = await stockTransfersApi.createStockTransfer({
        businessPartnerCode: businessPartnerCode,
        docDate: moment(docDate).format("YYYY-MM-DD"),
        fromWarehouse: "100",
        toWarehouse: "100",
        salesPersonCode: salesPersonCode,
        lines: stockTransferLines,
        comments: this.joinComments(comments)
      });

      return result.body;
    } catch (error) {
      return Promise.reject(
        createStackedReject(
          "Create SAP stock transfer request failed.",
          error instanceof HttpError ?
            new Error(`${error.message}: ${JSON.stringify(error.body) || ""}`) :
            error
        )
      );
    }
  }

  /**
   * Translates SAP stock transfer to list of delivery loans
   *
   * @param stockTransfer stock transfer
   */
  private translateStockTransfer = (stockTransfer: SapStockTransfer) => {
    const linesByItem = _.groupBy(stockTransfer.lines, line => line.itemCode);
    const deliveryLoans: DeliveryLoan[] = [];

    for (const itemCode in linesByItem) {
      const lines = linesByItem[itemCode];
      const item = this.getLoanItemFromCode(itemCode);

      if (!item) {
        getLogger().error(`translateStockTransfer: loan item not found for item code ${itemCode}`);
        continue;
      }

      const loans = lines.filter(this.lineIsType("LOAN"));
      const returns = lines.filter(this.lineIsType("RETURN"));

      const loanedAmount = loans.reduce((sum, { quantity }) => sum + quantity, 0);
      const returnedAmount = returns.reduce((sum, { quantity }) => sum + quantity, 0);

      deliveryLoans.push({
        item: item,
        loaned: loanedAmount,
        returned: returnedAmount
      });
    }

    return deliveryLoans;
  }

  /**
   * Translates loans to SAP stock transfer lines
   *
   * @param loans loans
   */
  private translateLoans = (loans: DeliveryLoan[]): SapStockTransferLine[] => {
    return loans.reduce<SapStockTransferLine[]>((lines, loan) => {
      const { item, loaned, returned } = loan;
      const itemCode: string = _.get(config(), [ "sap", "loanProductIds", item ]);

      if (!itemCode) {
        throw new Error(`SAP item code not found for loan item ${item}`);
      }

      if (returned > 0) {
        lines.push({
          itemCode: Number(itemCode),
          quantity: returned,
          binAllocations: [
            { absEntry: 2, actionType: BinActionType.ToWarehouse, },
            { absEntry: 3, actionType: BinActionType.FromWarehouse },
          ]
        });
      }

      if (loaned > 0) {
        lines.push({
          itemCode: Number(itemCode),
          quantity: loaned,
          binAllocations: [
            { absEntry: 3, actionType: BinActionType.ToWarehouse },
            { absEntry: 2, actionType: BinActionType.FromWarehouse },
          ]
        });
      }

      return lines;
    }, []);
  };

  /**
   * Returns a function that returns whether stock transfer line is of given type
   *
   * @param type loan or return
   */
  private lineIsType = (type: "LOAN" | "RETURN") => ({ binAllocations }: SapStockTransferLine) => {
    const action = {
      "LOAN": BinActionType.FromWarehouse,
      "RETURN": BinActionType.ToWarehouse
    }[type];

    return binAllocations.some(({ absEntry, actionType }) =>
      actionType === action &&
      absEntry === 3
    );
  }

  /**
   * Returns loan item from given item code
   *
   * @param itemCode item code
   */
  private getLoanItemFromCode = (itemCode: string) => {
    const loanItemEntries = Object.entries(config().sap.loanProductIds) as [ string, string ][];

    const [ loanItem ] = loanItemEntries.find(([ _, code ]) => code === itemCode) || [];

    return loanItem as DeliveryLoanItem | undefined;
  }

  /**
   * Joins list of comments to single comment string
   *
   * @param comments list of comments
   */
  private joinComments = (comments: string[]) => {
    return _.truncate(comments.join(" ; "), { "length": 253 });
  }

}
