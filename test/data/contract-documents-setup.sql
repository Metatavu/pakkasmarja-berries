INSERT INTO DocumentTemplates (createdAt, updatedAt, contents, header, footer) values (NOW(), NOW(), '<h1>Example berry purchase contract</h1><p><b>CONTRACTING PARTIES AND PURPOSE</b></p><p>{{{ companyName }}} (farmer in future) and Example Co. (company in future).</p><h3>Prices</h3><p>{{{ pricetable }}}</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc cursus nisi eget mi pulvinar, nec consectetur turpis efficitur. Praesent ac cursus ligula. Fusce varius felis dui, non aliquam dui vehicula non. Aenean felis diam, tincidunt vel pretium quis, lobortis ut diam. Aliquam pulvinar, tortor eu pretium ornare, ante nulla sagittis sapien, eu mattis massa elit non nulla. Proin {{{ deliveryPlace }}} sollicitudin neque non semper. Morbi vel mauris elementum, tempus elit vestibulum, posuere eros. Vestibulum congue porta finibus. Aenean sodales rhoncus justo sit amet pharetra. Cras vehicula mollis velit in tincidunt. Donec eu justo eget turpis venenatis ultricies quis vitae est. Nulla sem augue, placerat nec felis et, vulputate feugiat leo. Vivamus lobortis sapien sapien, nec viverra elit imperdiet condimentum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>', '<div class="row"><div class="col-6"><img src="https://cdn.metatavu.io/assets/pakkasmarja-berries/logo-120x120.jpg"/></div><div class="col-6 text-right"><span class="page"></span> (<span class="topage"></span>)</div></div><br/>','<hr/><div class="row"><div class="col-4 text-left"><small>Example berry purchase contract (v.2020)</small></div><div class="col-4 text-center"><small>Example Ltd</small></div><div class="col-4 text-right"><small><a href="https://www.example.com">https://www.example.com</a></small></div></div>');
INSERT INTO ContractDocumentTemplates (createdAt, updatedAt, externalId, type, contractId, documentTemplateId) VALUES (NOW(), NOW(), '2ba4ace6-2227-11e8-8cd7-ef6b34e82618', 'master', (SELECT id FROM Contracts WHERE externalId = '1d45568e-0fba-11e8-9ac4-a700da67a976'), (SELECT max(id) FROM DocumentTemplates));
INSERT INTO DocumentTemplates (createdAt, updatedAt, contents) values (NOW(), NOW(), '<h1>Example group purchase contract</h1><p><b>CONTRACTING PARTIES AND PURPOSE</b></p><p>{{{ companyName }}} (company in future) and Example Co. (company in future).</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc cursus nisi eget mi pulvinar, nec consectetur turpis efficitur. Praesent ac cursus ligula. Fusce varius felis dui, non aliquam dui vehicula non. Aenean felis diam, tincidunt vel pretium quis, lobortis ut diam. Aliquam pulvinar, tortor eu pretium ornare, ante nulla sagittis sapien, eu mattis massa elit non nulla. Proin mattis sollicitudin neque non semper. Morbi vel mauris elementum, tempus elit vestibulum, posuere eros. Vestibulum congue porta finibus. Aenean sodales rhoncus justo sit amet pharetra. Cras vehicula mollis velit in tincidunt. Donec eu justo eget turpis venenatis ultricies quis vitae est. Nulla sem augue, placerat nec felis et, vulputate feugiat leo. Vivamus lobortis sapien sapien, nec viverra elit imperdiet condimentum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>');
INSERT INTO ItemGroupDocumentTemplates (createdAt, updatedAt, externalId, type, itemGroupId, documentTemplateId) VALUES (NOW(), NOW(), '2fe6ad72-2227-11e8-a5fd-efc457362c53', 'group', (SELECT id FROM ItemGroups WHERE externalId = '98be1d32-0f51-11e8-bb59-3b8b6bbe9a20'), (SELECT max(id) FROM DocumentTemplates));