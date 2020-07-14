import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.createTable("OpeningHourPeriods", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true },
      deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
      beginDate: { type: Sequelize.DATE, allowNull: false },
      endDate: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    await query.createTable("OpeningHourDays", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true },
      periodId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "OpeningHourPeriods", key: "id" } },
      dayType: { type: Sequelize.STRING(191), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    await query.createTable("OpeningHourDayIntervals", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true },
      dayId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "OpeningHourDays", key: "id" } },
      opens: { type: Sequelize.DATE, allowNull: false },
      closes: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    await query.createTable("OpeningHourExceptions", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true },
      deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
      exceptionDate: { type: Sequelize.DATEONLY },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    await query.createTable("OpeningHourExceptionIntervals", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true },
      exceptionId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "OpeningHourExceptions", key: "id" } },
      opens: { type: Sequelize.DATE, allowNull: false },
      closes: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });
  }
};