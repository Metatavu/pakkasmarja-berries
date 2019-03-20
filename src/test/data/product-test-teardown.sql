DELETE FROM Products;
UPDATE ItemGroups SET prerequisiteContractItemGroupId = NULL WHERE id=1005 OR id=2005;
DELETE FROM ItemGroups WHERE id=1005 OR id=2005;