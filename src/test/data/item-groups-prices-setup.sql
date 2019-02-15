INSERT INTO
  ItemGroupPrices (externalId, groupName, unit, price, year, itemGroupId, createdAt, updatedAt)
VALUES 
  ('2cef70dc-3103-11e8-bc28-9b65ff9275bf', 'Group 1', '€ / l', '4.10', 2017, (SELECT id FROM ItemGroups WHERE externalId = '89723408-0f51-11e8-baa0-dfe7c7eae257'), NOW(), NOW()),
  ('30685c88-3103-11e8-91df-87fa68b14005', 'Group 1', '€ / l', '8.00', 2019, (SELECT id FROM ItemGroups WHERE externalId = '89723408-0f51-11e8-baa0-dfe7c7eae257'), NOW(), NOW()),
  ('79d937fc-3103-11e8-a1f7-5f974dead07c', 'Group 2', '$ / kg', '2.10', 2017, (SELECT id FROM ItemGroups WHERE externalId = '98be1d32-0f51-11e8-bb59-3b8b6bbe9a20'), NOW(), NOW()),
  ('7f1761a8-3103-11e8-b2e0-1b2fa8a35f72', 'Group 2', '$ / kg', '1.00', 2019, (SELECT id FROM ItemGroups WHERE externalId = '98be1d32-0f51-11e8-bb59-3b8b6bbe9a20'), NOW(), NOW());