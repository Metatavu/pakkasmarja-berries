INSERT INTO 
    ItemGroups (id, externalId, sapId, name, displayName, category, minimumProfitEstimation, createdAt, updatedAt)
VALUES 
  (1005, 'a9d715c6-4a09-11e9-8646-d663bd873d93', '001122', '123456/Test Group 1', 'Test Group 1', 'FROZEN', 100, NOW(), NOW()),
  (2005, 'a9d71b20-4a09-11e9-8646-d663bd873d93', '112233', '234567/Test Group 2', null, 'FRESH', 0, NOW(), NOW());

INSERT INTO
  Products (id, itemGroupId, name, units, unitSize, unitName, sapItemCode, createdAt, updatedAt)
VALUES
  ('b1590990-4bbb-11e9-8646-d663bd873d93', 1005, 'Product 1', 100, 10, 'KG', 'SAP1', NOW(), NOW()),
  ('b1590dd2-4bbb-11e9-8646-d663bd873d93', 2005, 'Product 2', 120, 20, 'KG', 'SAP2', NOW(), NOW());

INSERT INTO
  ProductPrices (id, productId, unit, price, createdAt, updatedAt)
VALUES
  ('6a8ef30b-f066-41bc-9efe-5816b61a2b04', 'b1590990-4bbb-11e9-8646-d663bd873d93', 'e / kg ALV 0%', 100, NOW(), NOW())
  ('80121ca0-1a7e-4135-823c-a55a9b85f463', 'b1590dd2-4bbb-11e9-8646-d663bd873d93', 'e / kg ALV 0%', 200, NOW(), NOW());

INSERT INTO 
    DeliveryPlaces (externalId, sapId, name, createdAt, updatedAt)
VALUES 
  ('bad02318-1a44-11e8-87a4-c7808d590a07', '567', 'Test Place 1', NOW(), NOW());

INSERT INTO 
    DeliveryQualities (id, itemGroupCategory, name, priceBonus, createdAt, updatedAt)
VALUES 
  ('bad02318-1a44-11e8-87a4-c7808d590bbb','FRESH', 'Great', 10, NOW(), NOW());