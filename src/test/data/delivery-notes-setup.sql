INSERT INTO 
    ItemGroups (id, externalId, sapId, name, displayName, category, minimumProfitEstimation, createdAt, updatedAt)
VALUES 
  (1005, 'a9d715c6-4a09-11e9-8646-d663bd873d93', '001122', '123456/Test Group 1', 'Test Group 1', 'FROZEN', 100, NOW(), NOW()),
  (2005, 'a9d71b20-4a09-11e9-8646-d663bd873d93', '112233', '234567/Test Group 2', null, 'FRESH', 0, NOW(), NOW());

INSERT INTO
  Products (id, itemGroupId, name, units, unitSize, unitName, createdAt, updatedAt)
VALUES
  ('b1590990-4bbb-11e9-8646-d663bd873d93', 1005, 'Product 1', 100, 10, 'KG', NOW(), NOW()),
  ('b1590dd2-4bbb-11e9-8646-d663bd873d93', 2005, 'Product 2', 120, 20, 'KG', NOW(), NOW());

INSERT INTO 
    DeliveryPlaces (id, externalId, sapId, name, createdAt, updatedAt)
VALUES 
  (1010, 'bad02318-1a44-11e8-87a4-c7808d590a07', '567', 'Test Place 1', NOW(), NOW());

INSERT INTO 
  Deliveries (id, productId, userId, time, status, amount, price, qualityId, deliveryPlaceId, createdAt, updatedAt)
VALUES
  ('bad02318-1a44-11e8-87a4-c7808d590a08', 'b1590990-4bbb-11e9-8646-d663bd873d93', '6f1cd486-107e-404c-a73f-50cc1fdabdd6', NOW(), 'PLANNED', 5, '16KG', NULL, 1010, NOW(), NOW())