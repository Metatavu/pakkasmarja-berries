import { Response, Request } from "express";
import SignAuthenticationServicesService from "../api/signAuthenticationServices.service";
import signature from "../../signature";
import { SignAuthenticationService } from "../model/models";

/**
 * Implementation for SignAuthenticationService REST service
 */
export default class SignAuthenticationServicesServiceImpl extends SignAuthenticationServicesService {

  /**
   * @inheritDoc
   */
  async listSignAuthenticationServices(req: Request, res: Response) {
    const authenticationMethods = await signature.getAuthenticationMethods();

    if (!authenticationMethods || !authenticationMethods.methods) {
      this.sendNotFound(res, "Authentication methods not found");
      return;
    }

    const respose = authenticationMethods.methods.map((method: any) => {
      const result: SignAuthenticationService = {
        identifier: method.identifier,
        image: method.image,
        name: method.name
      };

      return result;
    });

    res.status(200).send(respose);
  }

}

