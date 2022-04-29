import { Response, Request, Application } from "express";
import Signature from "../signature";
import models from "../models";
import { createStackedReject, logReject } from "../utils";
import { getLogger } from "log4js";
import ErpClient from "../erp/client";
import userManagement, { UserProperty } from "../user-management";
import { SapContractStatus } from "../generated/erp-services-client/api";

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

              const user = await userManagement.findUser(contract.userId);
              const businessPartnerCode = user ?
                userManagement.getSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE) :
                null;

              if (!businessPartnerCode) {
                throw Error(`Could not resolve SAP business partner code for user ${contract.userId}`);
              }

              const contractsApi = await ErpClient.getContractsApi();
              const response = await contractsApi.createContract({
                businessPartnerCode: parseInt(businessPartnerCode),
                contactPersonCode: 0,
                itemGroupCode: parseInt(itemGroup.sapId),
                deliveredQuantity: contract.deliveredQuantity || 0,
                startDate: contract.startDate ? contract.startDate.toISOString() : undefined,
                endDate: contract.endDate ? contract.endDate.toISOString() : undefined,
                signingDate: contract.signDate ? contract.signDate.toISOString() : undefined,
                terminateDate: undefined,
                remarks: contract.remarks || "",
                status: SapContractStatus.Approved
              });

              if (response.response.statusCode !== 200) {
                throw new Error(`Could not create SAP contract: ${response.response.statusMessage}`);
              }

              await models.updateContractSapId(contractId, response.body.id!);
            } catch (error) {
              logReject(
                createStackedReject(`Could not update contract of signed contract document ${id} to SAP`, error),
                getLogger()
              );
            }
          } else {
            console.error(`Could not find contract document for vismasignId ${vismaSignDocumentId}`);
          }
        }

      } catch (error) {
        success = false;
        console.error(`Error verifying document status with vismasignId ${vismaSignDocumentId}`, error);
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