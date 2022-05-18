import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {
  up: async (query: QueryInterface) => {
    await query.addColumn("DeliveryPlaces", "deprecated", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await query.sequelize.query("UPDATE DeliveryPlaces SET deprecated = false");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = externalId");

    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '03' WHERE name = 'Suonenjoki'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '21' WHERE name = 'Vesanto Toripiha'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '23' WHERE name = 'Turku Kylmäsäilö'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '22' WHERE name = 'Heinävaara Marja Carelia'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '24' WHERE name = 'Puumala'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '29' WHERE name = 'Aten Marja Oy'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '25', name = 'Riitan Herkku Oy, Mustasaari/Vaasa' WHERE name = 'Marja Bothnia Mustasaari'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = '27' WHERE name = 'Lempäälä'");

    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = 'REMOVED1', deprecated = true WHERE name = 'Taureen Kerimäki'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = 'REMOVED2', deprecated = true WHERE name = 'Siiskosen Leipomo'");
    await query.sequelize.query("UPDATE DeliveryPlaces SET sapId = 'REMOVED3', deprecated = true WHERE name = 'Pyhäsalmi'");
  }
}