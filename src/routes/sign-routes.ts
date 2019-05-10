import { Response, Request, Application } from "express";
import Signature from "../signature";
import models from "../models";

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
    
    if (redirectUrl) {
      res.redirect(redirectUrl);
    } else {
      res.render("signcallback", {
        success: success
      });
    }

  }
};