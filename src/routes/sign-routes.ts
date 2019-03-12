import { Response, Request, Application } from "express";
import Signature from "../signature";
import models from "../models";

/**
 * System routes
 */
export default class SignRoutes {
  
  constructor (app: Application) {
    app.get("/signcallback", this.getSignCallback.bind(this));
  }
  
  private async getSignCallback(req: Request, res: Response) {
    const vismaSignDocumentId = req.query.vismaSignId;
    let success = false;
    if (vismaSignDocumentId) {
      try {
        const documentStatus = await Signature.getDocumentStatus(vismaSignDocumentId);
        success = documentStatus && documentStatus.status === "signed";

        if (success) {
          const contractDocument = await models.findContractDocumentByVismaSignDocumentId(vismaSignDocumentId);
          if (contractDocument) {
            models.updateContractDocumentSigned(contractDocument.id, true);
            models.updateContractStatus(contractDocument.contractId, "APPROVED");
          } else {
            console.error(`Could not find contract document for vismasignId ${vismaSignDocumentId}`);
          }
        }

      } catch (e) {
        success = false;
        console.error(`Error verifying document status with vismasignId ${vismaSignDocumentId}`, e);
      }
    }

    res.status(200).end();
  }
};