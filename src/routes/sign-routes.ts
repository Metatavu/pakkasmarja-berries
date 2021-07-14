import { Response, Request, Application } from "express";
import Signature from "../signature";
import models from "../models";
import SapContractsServiceImpl from "../sap/impl/contracts";
import { createStackedReject, logReject } from "../utils";
import { getLogger } from "log4js";

/**
 * Sign routes
 */
export default class SignRoutes {

  /**
   * Constructor
   *
   * @param app app
   */
  constructor (app: Application) {
    app.get("/signcallback", this.getSignCallback.bind(this));
  }

  /**
   * Sign callback
   *
   * @param req request
   * @param res response
   */
  private async getSignCallback(req: Request, res: Response) {
    const vismaSignDocumentId = req.query.vismaSignId;
    const redirectUrl = req.query.redirectUrl;

    let success = false;
    if (vismaSignDocumentId) {
      try {
        const documentStatus = await Signature.getDocumentStatus(vismaSignDocumentId);
        success = documentStatus && documentStatus.status === "signed";

        if (success) {
          const contractDocument = await models.findContractDocumentByVismaSignDocumentId(vismaSignDocumentId);
          if (contractDocument) {
            const { id, contractId } = contractDocument;
            models.updateContractDocumentSigned(id, true);
            models.updateContractStatus(contractId, "APPROVED");
            try {
              const contract = await models.findContractById(contractId);
              if (!contract) {
                throw Error("Could not find contract from database");
              }

              const deliveryPlace = await models.findDeliveryPlaceById(contract.deliveryPlaceId);
              if (!deliveryPlace) {
                throw Error("Could not find contract delivery place from database");
              }

              const itemGroup = await models.findItemGroupById(contract.itemGroupId);
              if (!itemGroup) {
                throw Error("Could not find contract item group from database");
              }

              await SapContractsServiceImpl.createOrUpdateSapContract(contract, deliveryPlace, itemGroup);
            } catch (error) {
              logReject(createStackedReject(`Could not update contract of signed contract document ${id} to SAP`, error), getLogger());
            }
          } else {
            console.error(`Could not find contract document for vismasignId ${vismaSignDocumentId}`);
          }
        }

      } catch (e) {
        success = false;
        console.error(`Error verifying document status with vismasignId ${vismaSignDocumentId}`, e);
      }
    }

    if (redirectUrl) {
      res.redirect(redirectUrl);
    } else {
      res.render("signcallback", {
        success: success
      });
    }

  }
};