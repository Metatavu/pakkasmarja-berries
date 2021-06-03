import { getLogger } from "log4js";
import moment = require("moment");
import models, { ContractModel, DeliveryPlaceModel, ItemGroupModel, ProductModel } from "../../models";
import userManagement, { UserProperty } from "../../user-management";
import { createStackedReject } from "../../utils";
import SapServiceFactory from "../service-layer-client";
import { SapContract, SapContractLine, SapContractStatusEnum } from "../service-layer-client/types";

/**
 * Class for SAP contracts service implementations
 */
export default class SapContractsServiceImpl {

  /**
   * Creates or updates SAP contract according to given contract database model
   *
   * @param contractModel contract database model
   * @param deliveryPlace delivery place database model
   * @param itemGroup item group database model
   * @returns promise of created or updated SAP contract
   */
  static createOrUpdateSapContract = async (
    contract: ContractModel,
    deliveryPlace: DeliveryPlaceModel,
    itemGroup: ItemGroupModel
  ): Promise<SapContract> => {
    try {
      const sapContractsService = SapServiceFactory.getContractsService();

      const user = await userManagement.findUser(contract.userId);
      if (!user) {
        return Promise.reject(`createOrUpdateSapContract: Contract user with ID "${contract.userId}" could not be found`);
      }

      const businessPartnerCode = userManagement.getSingleAttribute(user, UserProperty.SAP_ID);
      if (!businessPartnerCode) {
        return Promise.reject(`createOrUpdateSapContract: Contract user SAP ID could not be found`);
      }

      const existingSapContracts = await sapContractsService.listActiveContractsByBusinessPartner(businessPartnerCode);
      if (existingSapContracts.length > 0) {
        const approvedContract = existingSapContracts.find(contract => contract.Status === SapContractStatusEnum.APPROVED);
        const onHoldContract = existingSapContracts.find(contract => contract.Status === SapContractStatusEnum.ON_HOLD);
        const draftContract = existingSapContracts.find(contract => contract.Status === SapContractStatusEnum.DRAFT);

        const existingContract = approvedContract || onHoldContract || draftContract;

        if (existingContract) {
          return await SapContractsServiceImpl.updateExistingSapContract(
            { ...existingContract },
            contract,
            itemGroup,
            deliveryPlace
          );
        }
      }

      return await SapContractsServiceImpl.createNewSapContract(contract, itemGroup, deliveryPlace);
    } catch (error) {
      return Promise.reject(createStackedReject("Failed to create or update SAP contract", error));
    }
  }

  /**
   * Creates new contract to SAP
   *
   * @param contract contract database model
   * @param itemGroup item group database model
   * @param deliveryPlace delivery place database model
   * @returns promise of created SAP contract
   */
  static createNewSapContract = async (
    contract: ContractModel,
    itemGroup: ItemGroupModel,
    deliveryPlace: DeliveryPlaceModel
  ): Promise<SapContract> => {
    try {
      const user = await userManagement.findUser(contract.userId);
      if (!user) {
        return Promise.reject(`createNewSapContract: Contract user with ID "${contract.userId}" could not be found`);
      }

      const userSapId = userManagement.getSingleAttribute(user, UserProperty.SAP_ID);
      if (!userSapId) {
        return Promise.reject("createNewSapContract: Contract user SAP ID could not be found");
      }

      const itemGroupSapId = Number(itemGroup.sapId);
      if (Number.isNaN(itemGroupSapId)) {
        return Promise.reject(`createNewSapContract: Item group's SAP ID "${itemGroup.sapId}" is invalid`);
      }

      const itemGroupPlannedAmountKey = `U_TR_${itemGroupSapId}`;
      const itemGroupProducts = await models.listProducts(itemGroup.id, null, null);
      const contractLines = SapContractsServiceImpl.updateSapContractLines([], itemGroupProducts, itemGroup, deliveryPlace);
      const startDate = `${moment().year()}-05-01`;
      const endDate = `${moment().year() + 1}-01-31`;
      const sapContractsService = SapServiceFactory.getContractsService();

      return await sapContractsService.createContract({
        BPCode: userSapId,
        ContactPersonCode: 0,
        BlanketAgreements_ItemsLines: contractLines,
        StartDate: startDate,
        EndDate: endDate,
        SigningDate: contract.signDate ? moment(contract.signDate).format("YYYY-MM-DD") : null,
        TerminateDate: null,
        Status: SapContractStatusEnum.DRAFT,
        [itemGroupPlannedAmountKey]: contract.contractQuantity,
        U_PFZ_Toi: deliveryPlace.sapId,
        Remarks: contract.remarks ? contract.remarks : null
      });
    } catch (error) {
      return Promise.reject(createStackedReject("Failed to create new SAP contract", error));
    }
  }

  /**
   * Updates existing contract to SAP
   *
   * @param sapContract SAP contract
   * @param contract contract database model
   * @param itemGroup item group database model
   * @param deliveryPlace delivery place database model
   * @returns promise of updated SAP contract
   */
  static updateExistingSapContract = async (
    sapContract: SapContract,
    contract: ContractModel,
    itemGroup: ItemGroupModel,
    deliveryPlace: DeliveryPlaceModel
  ): Promise<SapContract> => {
    try {
      const updatedContract = { ...sapContract };
      const sapContractsService = SapServiceFactory.getContractsService();
      const contractLines = updatedContract.BlanketAgreements_ItemsLines;

      const itemGroupSapId = Number(itemGroup.sapId);
      if (Number.isNaN(itemGroupSapId)) {
        return Promise.reject(`updateExistingSapContract: SAP ID "${itemGroup.sapId}" in item group "${itemGroup.name}" is invalid`);
      }

      if (contractLines.every(line => `${line.ItemGroup}` !== itemGroup.sapId)) {
        const products = await models.listProducts(itemGroup.id, null, null);

        updatedContract.BlanketAgreements_ItemsLines = SapContractsServiceImpl.updateSapContractLines(
          [ ...contractLines ],
          products,
          itemGroup,
          deliveryPlace
        );
      }

      const { contractQuantity } = contract;
      const itemGroupPlannedAmountKey = `U_TR_${itemGroupSapId}`;
      updatedContract[itemGroupPlannedAmountKey] = contractQuantity;
      updatedContract.U_PFZ_Toi = deliveryPlace.sapId;
      updatedContract.Remarks = contract.remarks;

      /**
       * If SAP contract already has status of approved, we need to also change
       * the status to on hold before we make any other changes or SAP can reject some of them.
       */
      if (sapContract.Status === SapContractStatusEnum.APPROVED) {
        await sapContractsService.updateContract({ ...sapContract, Status: SapContractStatusEnum.ON_HOLD });
      }

      return await sapContractsService.updateContract(updatedContract);
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to update existing SAP contract", e));
    }
  }

  /**
   * Fills given list of contract lines with all products from one item group if any are missing
   *
   * @param contractLines contract lines
   * @param itemGroupProducts item group products
   * @param itemGroup item group database model
   * @param deliveryPlace delivery place database model
   * @returns updated list of contract lines
   */
  static updateSapContractLines = (
    contractLines: SapContractLine[],
    itemGroupProducts: ProductModel[],
    itemGroup: ItemGroupModel,
    deliveryPlace: DeliveryPlaceModel
  ): SapContractLine[] => {
    itemGroupProducts.forEach(product => {
      const itemGroupSapId = Number(itemGroup.sapId);
      const itemGroupSapIdValid = !Number.isNaN(itemGroupSapId);

      if (!itemGroupSapIdValid) {
        getLogger().info(`updateSapContractLines: Item group SAP ID ${itemGroupSapId} was not valid and thus was not added to SAP contract`);
      }

      const correctItemGroup = product.itemGroupId === itemGroup.id;
      if (!correctItemGroup) {
        getLogger().info(`updateSapContractLines: Product item group ${product.itemGroupId} was not equal to item group ID ${itemGroup.id} and thus was not added to SAP contract`);
      }

      const notInList = contractLines.every(line => line.ItemNo !== product.sapItemCode);
      if (!notInList) {
        getLogger().info(`updateSapContractLines: Product with SAP ID ${product.sapItemCode} was already found from contract and thus was not added`);
      }

      if (itemGroupSapIdValid && correctItemGroup && notInList) {
        contractLines.push({
          ItemGroup: itemGroupSapId,
          ItemNo: product.sapItemCode,
          PlannedQuantity: 1,
          CumulativeQuantity: 0,
          ShippingType: -1,
          U_PFZ_ToiP: deliveryPlace.sapId
        });
      }
    });

    return contractLines;
  }

  /**
   * Removes all contract data from SAP contract
   *
   * @param contract contract database model
   * @param itemGroup item group database model
   * @returns promise of updated SAP contract
   */
  static removeContractFromSapContract = async (contract: ContractModel, itemGroup: ItemGroupModel): Promise<SapContract> => {
    try {
      const { sapId } = contract;
      if (!sapId) {
        return Promise.reject("removeContractFromSapContract: Contract has no SAP ID");
      }

      const docNum = await SapContractsServiceImpl.getDocNumFromContractSapId(sapId);
      if (!docNum) {
        return Promise.reject(`removeContractFromSapContract: Contract SAP ID "${sapId}" is invalid`);
      }

      const sapContractsService = SapServiceFactory.getContractsService();
      const existingSapContract = await sapContractsService.findContract(docNum);

      if (!existingSapContract) {
        return Promise.reject(`removeContractFromSapContract: SAP contract with document number "${docNum}" could not be found`);
      }

      const itemGroupSapId = Number(itemGroup.sapId);
      if (Number.isNaN(itemGroupSapId)) {
        return Promise.reject(`removeContractFromSapContract: SAP ID "${itemGroup.sapId}" in item group "${itemGroup.name}" is invalid`);
      }

      const itemGroupPlannedAmountKey = `U_TR_${itemGroupSapId}`;
      return await sapContractsService.updateContract({
        ...existingSapContract,
        [itemGroupPlannedAmountKey]: 0
      });
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to remove contract data from SAP contract", e));
    }
  }

  /**
   * Returns document number from given contract SAP ID
   *
   * @param contractSapId contract SAP ID
   * @returns promise of contracts document number in SAP or undefined if SAP ID is undefined
   * @throws rejected promise if contract SAP ID is invalid
   */
  static getDocNumFromContractSapId = async (contractSapId?: string): Promise<number | undefined> => {
    if (!contractSapId) {
      return;
    }

    const splitSapId = contractSapId.split("-");
    if (splitSapId.length !== 3) {
      return Promise.reject(`SAP ID "${contractSapId}" is invalid`);
    }

    const docNum = Number(splitSapId[1]);

    if (Number.isNaN(docNum)) {
      return Promise.reject(`SAP ID "${contractSapId}" is invalid`);
    }

    return docNum;
  }

}
