import DeliveryLoansService from "../api/deliveryLoans.service";
import { DeliveryLoan } from "../model/deliveryLoan";
import { Request, Response } from "express";
import SapDeliveriesServiceImpl from "src/sap/impl/deliveries";
import userManagement, { UserProperty } from "src/user-management";
import { createStackedReject, logReject } from "src/utils";
import { getLogger } from "log4js";
import ApplicationRoles from "../application-roles";

/**
 * Implementation for Deliveries REST service
 */
 export default class DeliveryLoansServiceImpl extends DeliveryLoansService {

  async createDeliveryLoan(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_DELIVERIES)) {
      return this.sendForbidden(res, "You have no permission to create delivery loans");
    }

    const contactid: string = req.body.contactId;
    const comment: string = req.body.comment;
    const loans: DeliveryLoan[] = req.body.loans;

    try {    
      if (!contactid) {
        return this.sendBadRequest(res, "Contact ID not found from request body");
      }

      const contact = await userManagement.findUser(contactid);

      if (!contact) {
        return this.sendBadRequest(res, `Contact not found with contact ID ${contactid}`);
      }

      const contactSapId = await userManagement.getSingleAttribute(contact, UserProperty.SAP_ID);

      if (!contactSapId) {
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
        if (loaned < 1 && returned < 1) {
          return this.sendBadRequest(res, "Delivery loan with no transfers found from request body");
        }  
      }

      await SapDeliveriesServiceImpl.createStockTransferToSap(
        new Date(),
        [ comment ],
        contactSapId,
        "0",
        loans
      );
      
      res.status(200).send(loans);
    } catch (error) {
        logReject(createStackedReject("Delivery loan could not be created", error), getLogger());
        this.sendInternalServerError(res, "Delivery loan could not be created");
    }
  
  }

}