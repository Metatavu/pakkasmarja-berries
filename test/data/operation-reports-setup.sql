INSERT INTO 
  OperationReports (id, externalId, type, createdAt, updatedAt)
VALUES 
  (1,'8d74dde0-e624-4397-8563-c13ba9c4803e','TEST_REPORT_1','2018-02-21 04:33:58','2018-02-21 04:33:58'),
  (2,'2aae1d5d-0230-47b2-bf9a-968828a6e6a0','TEST_REPORT_2','2018-02-21 04:57:56','2018-02-21 04:57:56');
INSERT INTO 
  OperationReportItems (id, message, operationReportId, completed, success, createdAt, updatedAt)
 VALUES 
   (1,'Great success', 1, true, true, '2018-02-21 04:33:58','2018-02-21 04:34:00'),
   (2,'Could not even', 1, true, false, '2018-02-21 04:33:58','2018-02-21 04:34:00'),
   (3, NULL, 2, false, false, '2018-02-21 04:33:58','2018-02-21 04:33:58'),
   (4, NULL, 2, false, false, '2018-02-21 04:33:58','2018-02-21 04:34:00'),
   (5,'Like a charm', 2, true, true, '2018-02-21 04:33:58','2018-02-21 04:34:00');