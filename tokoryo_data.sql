
TRUNCATE TABLE 
    public.transaction_items,
    public.transactions,
    public.stock_movements,
    public.stock_opname_items,
    public.stock_opnames,
    public.product_units,
    public.products,
    public.categories,
    public.brands,
    public.suppliers,
    public.customers,
    public.cash_shifts,
    public.cashier_shifts,
    public.audit_logs,
    public.settings,
    public.ai_settings,
    public.user_roles,
    public.users
CASCADE;

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ai_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.ai_settings DISABLE TRIGGER ALL;

COPY public.ai_settings (id, active_provider, gemini_key, openai_key, groq_key, sumopod_key, sumopod_model, created_at, updated_at) FROM stdin;
2e0e5326-4884-4f5b-bdfd-fce309ac9af2	gemini	\N	\N	\N	\N	deepseek-chat	2026-08-17 11:10:31.297565	2026-08-17 11:10:31.297565
\.


ALTER TABLE public.ai_settings ENABLE TRIGGER ALL;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs DISABLE TRIGGER ALL;

COPY public.audit_logs (id, user_id, action_type, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
b06f5842-5e9a-4904-8fe1-06788cc87c2e	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	\N	{"name":"Tes","category":"tes","brand":"tes","price":150000,"costPrice":75000,"stock":100,"minStock":5,"sku":"tes-123","barcode":"","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-17 15:08:38.003943
dd17025e-cacd-4b55-a4fb-f5c89412a2e2	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	620b74dc-1c25-44cd-bb5e-dfea3601bc47	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":150000,"discount":7500,"tax":0,"total":142500,"paymentMethod":"cash","paymentAmount":150000,"changeAmount":7500,"status":"completed","latitude":-0.9419369999999999,"longitude":100.36629499999998}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-17 15:11:57.97762
2543858a-b311-4c9a-99bb-c09799094786	fdbad7ac-f7a9-4254-b37b-fe1a218b0bc6	CREATE	transaction	ac77dbc3-0bec-470f-882f-ffc72256b8e7	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":150000,"discount":0,"tax":0,"total":150000,"paymentMethod":"transfer","paymentAmount":150000,"changeAmount":0,"status":"completed","latitude":-0.9419735,"longitude":100.36630249999999}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-17 15:14:02.845588
b8bf3961-4111-4613-806a-fd69a339f9b1	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	cd53bd7b-deac-4489-bd14-126d2cd766ee	\N	{"name":"sandrela","category":"","brand":"","price":40000,"costPrice":0,"stock":0,"minStock":0,"sku":"7","barcode":"7779981024142","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:29:55.186844
78d57312-41a8-4a3b-bb18-c9b6ca997269	b07e47a5-7a93-4815-a52a-689417355376	DELETE	product	cd53bd7b-deac-4489-bd14-126d2cd766ee	{"id":"cd53bd7b-deac-4489-bd14-126d2cd766ee","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"sandrela","description":null,"price":"40000.00","cost":"0.00","cost_price":"0.00","stock":0,"min_stock":0,"unit":"pcs","barcode":"7779981024142","sku":"7","image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-18T06:29:55.184Z","updated_at":"2026-08-18T06:29:55.184Z"}	\N	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:30:12.741906
4845b16b-c7a3-4d4a-be05-7d880f1c23aa	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	1af345a4-d577-4b0b-ab2c-b7710af96d8c	\N	{"name":"SANDRELLA EDP 100ML","category":"","brand":"","price":40000,"costPrice":38000,"stock":10,"minStock":0,"sku":"7","barcode":"7779981024142","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:31:40.880215
f6467d44-1dfa-4e29-b272-cbd1caf93c12	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	d0e6fa4d-d0a5-48ad-ac3f-1322ba4c313a	\N	{"customerName":"Walk-in Customer","items":[{"productId":"1af345a4-d577-4b0b-ab2c-b7710af96d8c","productName":"SANDRELLA EDP 100ML","price":40000,"quantity":1,"subtotal":40000}],"subtotal":40000,"discount":0,"tax":0,"total":40000,"paymentMethod":"cash","paymentAmount":40000,"changeAmount":0,"status":"completed","latitude":-1.346780643967483,"longitude":100.58387455748814}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:32:14.088307
fa3f61a9-4478-43b6-86fd-755a06426b67	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	894fbea9-0a37-401d-b370-a9552a98c4c9	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":150000,"discount":0,"tax":0,"total":150000,"paymentMethod":"cash","paymentAmount":150000,"changeAmount":0,"status":"completed","latitude":-1.346780643967483,"longitude":100.58387455748814}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:36:12.900082
b8e846d4-5e8f-42cb-bac2-8d058ee1b2df	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	dd42653e-c28c-4952-9d69-3ca803eddf96	\N	{"customerName":"Walk-in Customer","items":[{"productId":"1af345a4-d577-4b0b-ab2c-b7710af96d8c","productName":"SANDRELLA EDP 100ML","price":40000,"quantity":1,"subtotal":40000},{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":190000,"discount":0,"tax":0,"total":190000,"paymentMethod":"cash","paymentAmount":190000,"changeAmount":0,"status":"completed","latitude":-1.346780643967483,"longitude":100.58387455748814}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:39:44.47364
16bda8df-b4c5-4965-b0b6-22cd6c4bbf47	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	e8593c35-680b-4381-9979-9df4c198b3df	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":150000,"discount":0,"tax":0,"total":150000,"paymentMethod":"cash","paymentAmount":150000,"changeAmount":0,"status":"completed","latitude":-1.346780643967483,"longitude":100.58387455748814}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:51:34.045582
b92408c8-a7fe-4247-bef6-6a4d4c23ac34	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	61acc284-51d5-402e-adaf-f3ad9a8f782e	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000}],"subtotal":150000,"discount":0,"tax":0,"total":150000,"paymentMethod":"cash","paymentAmount":150000,"changeAmount":0,"status":"completed","latitude":-1.346780643967483,"longitude":100.58387455748814}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 13:52:58.613222
82abfd3c-189b-4140-b2ae-9ac1462d5116	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	88e7c775-b008-43ce-9524-822a19cfca97	\N	{"name":"Vasline lip care pot","category":"Lipstik","brand":"Vaseline","price":35000,"costPrice":27000,"stock":12,"minStock":3,"sku":"305210231597","barcode":"305210231597","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-19 02:36:35.928278
3a6450ea-0912-44ae-921b-4b805180d34e	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	7448b0bb-5e2f-4bfe-b953-104e5120fdab	\N	{"customerName":"Walk-in Customer","items":[{"productId":"88e7c775-b008-43ce-9524-822a19cfca97","productName":"Vasline lip care pot","price":35000,"quantity":1,"subtotal":35000}],"subtotal":35000,"discount":0,"tax":0,"total":35000,"paymentMethod":"cash","paymentAmount":35000,"changeAmount":0,"status":"completed","latitude":-1.3466869,"longitude":100.5842238}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-19 02:37:23.399019
02c7cdca-6d4e-48dc-9fd9-d6fea3b0cf01	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	UPDATE	product	c19614d2-4550-4087-8dae-a49478bbd0d3	{"id":"c19614d2-4550-4087-8dae-a49478bbd0d3","user_id":"b7b3a60f-86b9-4a55-9f07-65db9e88d5b1","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"Kopi Susu Gula Aren","description":null,"price":"18000.00","cost":"0.00","cost_price":"8000.00","stock":50,"min_stock":0,"unit":"pcs","barcode":null,"sku":null,"image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-17T03:52:33.598Z","updated_at":"2026-08-17T03:52:33.598Z"}	{"id":"c19614d2-4550-4087-8dae-a49478bbd0d3","name":"Kopi Susu Gula Arens","category":"","brand":"","price":18000,"costPrice":10000,"stock":50,"minStock":0,"sku":"PRD-QMGM8735","barcode":"","image":"","createdAt":"2026-08-17T03:52:33.598Z","updatedAt":"2026-08-17T03:52:33.598Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":false,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned"}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 02:50:58.136911
8673d7ef-452e-470b-97b2-c8a1c732d538	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	\N	{"name":"N\\"CO EDP 50ML","category":"PARFUM","brand":"NCO","price":50000,"costPrice":60000,"stock":0,"minStock":0,"sku":"PRD-OS9K0139","barcode":"","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 02:53:31.181227
9ca4976f-c446-41ba-8d6f-0b6cbb1972f9	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	35c1c3a5-b679-47b6-9ab3-3e40fd47a5ac	\N	{"customerName":"Walk-in Customer","items":[{"productId":"1af345a4-d577-4b0b-ab2c-b7710af96d8c","productName":"SANDRELLA EDP 100ML","price":40000,"quantity":1,"subtotal":40000}],"subtotal":40000,"discount":0,"tax":0,"total":40000,"paymentMethod":"cash","paymentAmount":40000,"changeAmount":0,"status":"completed","latitude":-1.3468085792185744,"longitude":100.58380772511045}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 03:32:28.460756
58ae5362-0b02-455e-80bc-7b6120a2d342	b07e47a5-7a93-4815-a52a-689417355376	UPDATE	product	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"eb2716c9-4271-491e-ba80-369d5b3d1cd3","category":"PARFUM","supplier_id":null,"brand_id":"c90ffd27-df79-4435-a77a-f7ea7bfdefd6","name":"N\\"CO EDP 50ML","description":null,"price":"50000.00","cost":"60000.00","cost_price":"0.00","stock":0,"min_stock":0,"unit":"pcs","barcode":null,"sku":"PRD-OS9K0139","image":null,"brand":"NCO","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-18T19:53:31.179Z","updated_at":"2026-08-18T19:53:31.179Z"}	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","name":"N\\"CO EDP 50ML","category":"PARFUM","brand":"NCO","price":50000,"costPrice":60000,"stock":12,"minStock":3,"sku":"PRD-OS9K0139","barcode":"8998824558444","image":"","createdAt":"2026-08-18T19:53:31.179Z","updatedAt":"2026-08-18T19:53:31.179Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":true,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned"}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 06:33:50.566315
823765eb-ada7-4086-8dcc-5787f3a03f31	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	d9d4432a-98e6-4b2b-844f-1d6ea4223e3f	\N	{"customerName":"Walk-in Customer","items":[{"productId":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","productName":"N\\"CO EDP 50ML","price":50000,"quantity":1,"subtotal":50000}],"subtotal":50000,"discount":0,"tax":0,"total":50000,"paymentMethod":"cash","paymentAmount":50000,"changeAmount":0,"status":"completed","latitude":-1.3467426155996094,"longitude":100.5839815068422}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 06:34:01.890058
938de3d9-7277-4666-a293-fd8c093b07a7	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	8f549c4c-7eba-4078-8bb9-a6ec12715025	\N	{"customerName":"Walk-in Customer","items":[{"productId":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","productName":"N\\"CO EDP 50ML","price":50000,"quantity":1,"subtotal":50000}],"subtotal":50000,"discount":0,"tax":0,"total":50000,"paymentMethod":"cash","paymentAmount":50000,"changeAmount":0,"status":"completed","latitude":-1.3467426155996094,"longitude":100.5839815068422}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 06:37:07.2985
79f5e836-bc21-421c-a458-f7a0351d6f2b	b07e47a5-7a93-4815-a52a-689417355376	UPDATE	product	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"eb2716c9-4271-491e-ba80-369d5b3d1cd3","category":"PARFUM","supplier_id":null,"brand_id":"c90ffd27-df79-4435-a77a-f7ea7bfdefd6","name":"N\\"CO EDP 50ML","description":null,"price":"50000.00","cost":"60000.00","cost_price":"0.00","stock":10,"min_stock":3,"unit":"pcs","barcode":"8998824558444","sku":"PRD-OS9K0139","image":null,"brand":"NCO","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-18T19:53:31.179Z","updated_at":"2026-08-18T19:53:31.179Z"}	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","name":"N'CO PARFUM EDP 50ML","category":"PARFUM","brand":"NCO","price":51000,"costPrice":60000,"stock":10,"minStock":3,"sku":"PRD-OS9K0139","barcode":"8998824558444","image":"","createdAt":"2026-08-18T19:53:31.179Z","updatedAt":"2026-08-18T19:53:31.179Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":true,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned"}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 06:55:04.896172
af697f6b-6442-4dfb-9b4b-b6e71b061dd6	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	CREATE	transaction	656bab01-84f0-42b2-95e7-be315aa08773	\N	{"customerName":"Walk-in Customer","items":[{"productId":"31630173-465b-475c-82dc-18aa59195056","productName":"Americano Ice 16oz","price":16000,"quantity":1,"subtotal":16000},{"productId":"2d2aba65-e294-4dc7-a78a-b7d6ca3e94a1","productName":"Roti Bakar Coklat Keju","price":15000,"quantity":1,"subtotal":15000},{"productId":"c19614d2-4550-4087-8dae-a49478bbd0d3","productName":"Kopi Susu Gula Arens","price":18000,"quantity":1,"subtotal":18000}],"subtotal":49000,"discount":0,"tax":0,"total":49000,"paymentMethod":"cash","paymentAmount":50000,"changeAmount":1000,"status":"completed","latitude":-0.9420424613505107,"longitude":100.36629936539315}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 11:05:07.697714
0f08510d-d095-4533-b2cf-c056b1abeb16	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	UPDATE	product	2d2aba65-e294-4dc7-a78a-b7d6ca3e94a1	{"id":"2d2aba65-e294-4dc7-a78a-b7d6ca3e94a1","user_id":"b7b3a60f-86b9-4a55-9f07-65db9e88d5b1","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"Roti Bakar Coklat Keju","description":null,"price":"15000.00","cost":"0.00","cost_price":"6000.00","stock":29,"min_stock":0,"unit":"pcs","barcode":null,"sku":null,"image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-17T03:52:33.600Z","updated_at":"2026-08-17T03:52:33.600Z"}	{"id":"2d2aba65-e294-4dc7-a78a-b7d6ca3e94a1","name":"Roti Bakar Coklat Keju","category":"","brand":"","price":15000,"costPrice":11500,"stock":29,"minStock":0,"sku":"PRD-S05N5009","barcode":"","image":"","createdAt":"2026-08-17T03:52:33.600Z","updatedAt":"2026-08-17T03:52:33.600Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":false,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned"}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 11:05:25.088135
8f0a829a-45ed-41b7-a360-57b5baaa68b9	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	UPDATE	product	31630173-465b-475c-82dc-18aa59195056	{"id":"31630173-465b-475c-82dc-18aa59195056","user_id":"b7b3a60f-86b9-4a55-9f07-65db9e88d5b1","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"Americano Ice 16oz","description":null,"price":"16000.00","cost":"0.00","cost_price":"5000.00","stock":99,"min_stock":0,"unit":"pcs","barcode":null,"sku":null,"image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-17T03:52:33.601Z","updated_at":"2026-08-17T03:52:33.601Z"}	{"id":"31630173-465b-475c-82dc-18aa59195056","name":"Americano Ice 16oz","category":"","brand":"","price":16000,"costPrice":125000,"stock":99,"minStock":0,"sku":"PRD-RFPY5690","barcode":"","image":"","createdAt":"2026-08-17T03:52:33.601Z","updatedAt":"2026-08-17T03:52:33.601Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":false,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned"}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 11:05:35.769317
ea8bef0f-539b-4a0c-a559-ef88bb99918f	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	CREATE	transaction	079e14e6-4066-49a7-9050-6ce5d5559ddb	\N	{"customerName":"Walk-in Customer","items":[{"productId":"c19614d2-4550-4087-8dae-a49478bbd0d3","productName":"Kopi Susu Gula Arens","price":18000,"quantity":1,"subtotal":18000},{"productId":"31630173-465b-475c-82dc-18aa59195056","productName":"Americano Ice 16oz","price":16000,"quantity":1,"subtotal":16000},{"productId":"2d2aba65-e294-4dc7-a78a-b7d6ca3e94a1","productName":"Roti Bakar Coklat Keju","price":15000,"quantity":1,"subtotal":15000}],"subtotal":49000,"discount":2450,"tax":0,"total":46550,"paymentMethod":"transfer","paymentAmount":46550,"changeAmount":0,"status":"completed","latitude":-0.9420424613505107,"longitude":100.36629936539315}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-19 11:05:58.322246
9656da13-0a72-4757-9bab-8da21544eeb1	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	777a4a83-9c51-4bfe-9f77-899c386333db	\N	{"customerName":"Walk-in Customer","items":[{"productId":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","productName":"Tes","price":150000,"quantity":1,"subtotal":150000},{"productId":"1af345a4-d577-4b0b-ab2c-b7710af96d8c","productName":"SANDRELLA EDP 100ML","price":40000,"quantity":1,"subtotal":40000},{"productId":"88e7c775-b008-43ce-9524-822a19cfca97","productName":"Vasline lip care pot","price":35000,"quantity":1,"subtotal":35000},{"productId":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","productName":"N'CO PARFUM EDP 50ML","price":51000,"quantity":1,"subtotal":51000}],"subtotal":276000,"discount":0,"tax":0,"total":276000,"paymentMethod":"cash","paymentAmount":300000,"changeAmount":24000,"status":"completed","latitude":-1.3467798177892918,"longitude":100.5839236380515}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 04:45:24.83813
57e01279-a98c-4ef3-b8f6-089f8f112f52	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	6f09b433-8da4-48cd-a124-23c5b4e905df	\N	{"name":"a","category":"","brand":"","price":125000,"costPrice":100000,"stock":20,"minStock":3,"sku":"tes-123","barcode":"","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 04:48:03.847643
4a242e37-953f-4341-ae9a-a287dcc70391	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	6eb3f9a7-459d-49d7-9530-55f9a69b7156	\N	{"name":"vaseline lip care pot","category":"Lipstik","brand":"Vaseline","price":35000,"costPrice":28000,"stock":15,"minStock":3,"sku":"305211231527","barcode":"305211231527","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.4.68.252	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.5 Mobile/15E148 Safari/604.1	2026-08-20 07:47:36.478998
adde263d-ad18-4165-9afd-73acdea3c111	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	dd1fcb85-09ea-4350-8baf-8f2ada68b4fe	\N	{"customerName":"Walk-in Customer","items":[{"productId":"88e7c775-b008-43ce-9524-822a19cfca97","productName":"Vasline lip care pot","price":35000,"quantity":1,"subtotal":35000}],"subtotal":35000,"discount":0,"tax":0,"total":35000,"paymentMethod":"cash","paymentAmount":35000,"changeAmount":0,"status":"completed","latitude":null,"longitude":null}	182.4.68.252	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.5 Mobile/15E148 Safari/604.1	2026-08-20 07:51:01.916415
66bc798e-43c0-480a-b7d3-e7000ca9dd4f	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	75217e73-1693-4609-8d15-060589b36de5	\N	{"customerName":"Walk-in Customer","items":[{"productId":"88e7c775-b008-43ce-9524-822a19cfca97","productName":"Vasline lip care pot","price":35000,"quantity":1,"subtotal":35000}],"subtotal":35000,"discount":0,"tax":0,"total":35000,"paymentMethod":"cash","paymentAmount":35000,"changeAmount":0,"status":"completed","latitude":-1.3466876,"longitude":100.5842218}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 07:56:28.269781
278f83f3-cb1f-4f9a-a448-608e0823b5fe	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	ee014d69-b14b-4d88-8eba-7e20273b057d	\N	{"customerName":"Walk-in Customer","items":[{"productId":"88e7c775-b008-43ce-9524-822a19cfca97","productName":"Vasline lip care pot","price":35000,"quantity":1,"subtotal":35000}],"subtotal":35000,"discount":0,"tax":0,"total":35000,"paymentMethod":"cash","paymentAmount":35000,"changeAmount":0,"status":"completed","latitude":-1.3466907,"longitude":100.5842141}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 07:57:56.244824
ec675f34-2363-4eef-a4ac-01a49b899bcc	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	eb79e3b0-978e-4b94-85d7-8a59416ac196	\N	{"name":"Stelan cargo cp boy","category":"Stelan","brand":"Hone baby","price":90000,"costPrice":55000,"stock":12,"minStock":3,"sku":"222116524310","barcode":"222116524310","description":"","image":"/uploads/product-1787213252196-579219902.jpg","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 08:07:32.269206
e3a4a288-523a-4948-aedd-b7ccf16e5e79	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	cdff7188-f38f-413a-9eee-146748e75db6	\N	{"customerName":"Walk-in Customer","items":[{"productId":"eb79e3b0-978e-4b94-85d7-8a59416ac196","productName":"Stelan cargo cp boy","price":90000,"quantity":1,"subtotal":90000}],"subtotal":90000,"discount":0,"tax":0,"total":90000,"paymentMethod":"cash","paymentAmount":90000,"changeAmount":0,"status":"completed","latitude":-1.3466797,"longitude":100.5842312}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 08:08:27.477363
0da4c4da-c2f2-4e52-b74e-33d36bc3e8cc	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	cf0512b1-b83f-472d-a6f4-d876f6a64787	\N	{"name":"Kaos kaki","category":"Kaos kaki","brand":"Kaos kaki","price":10000,"costPrice":7000,"stock":12,"minStock":3,"sku":"11187329000","barcode":"11187329000","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 08:37:03.83107
836386c3-7983-41b0-89cc-f0685e9041e0	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	c9fd1f59-a4ca-46c3-a339-80b199480f93	\N	{"customerName":"Walk-in Customer","items":[{"productId":"cf0512b1-b83f-472d-a6f4-d876f6a64787","productName":"Kaos kaki","price":10000,"quantity":1,"subtotal":10000}],"subtotal":10000,"discount":0,"tax":0,"total":10000,"paymentMethod":"cash","paymentAmount":10000,"changeAmount":0,"status":"completed","latitude":-1.3466852,"longitude":100.5842212}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 08:37:37.451258
c7604c05-2805-4971-8ac1-43b321258ec8	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	0090d4ad-34e4-4c12-a414-a8b017114fb2	\N	{"customerName":"Walk-in Customer","items":[{"productId":"cf0512b1-b83f-472d-a6f4-d876f6a64787","productName":"Kaos kaki","price":10000,"quantity":1,"subtotal":10000}],"subtotal":10000,"discount":0,"tax":0,"total":10000,"paymentMethod":"cash","paymentAmount":50000,"changeAmount":40000,"status":"completed","latitude":-1.346692,"longitude":100.5842187}	103.190.46.23	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 08:38:58.188994
1fb31182-bb3b-4066-89de-f14a53d1f828	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	CREATE	product	e5a71af8-cc36-42b9-ac9f-e090a9926b86	\N	{"name":"Sampo Mantap","category":"","brand":"","price":2000,"costPrice":1000,"stock":1000,"minStock":1,"sku":"8995680885974","barcode":"8998562805688","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 09:57:24.652449
0c0ed0ae-8261-4d61-9374-373df9bc4469	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	UPDATE	product	e5a71af8-cc36-42b9-ac9f-e090a9926b86	{"id":"e5a71af8-cc36-42b9-ac9f-e090a9926b86","user_id":"b7b3a60f-86b9-4a55-9f07-65db9e88d5b1","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"Sampo Mantap","description":null,"price":"2000.00","cost":"1000.00","cost_price":"0.00","stock":1000,"min_stock":1,"unit":"pcs","barcode":"8998562805688","sku":"8995680885974","image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-20T02:57:24.650Z","updated_at":"2026-08-20T02:57:24.650Z"}	{"id":"e5a71af8-cc36-42b9-ac9f-e090a9926b86","user_id":"b7b3a60f-86b9-4a55-9f07-65db9e88d5b1","category_id":null,"category":"","supplier_id":null,"brand_id":null,"name":"Sampo Mantap","description":"","price":2000,"cost":"1000.00","cost_price":"0.00","stock":1000,"min_stock":1,"unit":"pcs","barcode":"8998562805688","sku":"8995680885974","image":"","brand":"","supplier":"","product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-20T02:57:24.650Z","updated_at":"2026-08-20T02:57:24.650Z","costprice":"1000.00","minstock":1,"producttype":"physical","ownershiptype":"owned","showinonlinestore":true,"isactive":true,"costPrice":1000,"minStock":0}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 09:57:38.103324
982deff9-da91-4a48-8052-ee53736308d7	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	CREATE	product	38d2e9fc-b04e-430d-864c-55e272f682f6	\N	{"name":"barcode 12","category":"","brand":"","price":250000,"costPrice":1179000,"stock":20,"minStock":3,"sku":"8992123666749","barcode":"8992123666749","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 10:54:12.404912
8476a634-99e3-40a5-8cfd-9001a29c42df	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	CREATE	product	940f4151-d82e-42ff-8076-3f570540c595	\N	{"name":"Cotton buts","category":"","brand":"","price":10000,"costPrice":8500,"stock":100,"minStock":5,"sku":"8994902018886","barcode":"8994902018886","description":"","image":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.9.200.45	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-20 12:23:19.774799
3fa0ff9a-57b2-48bc-98b9-69d9d6226f4c	b07e47a5-7a93-4815-a52a-689417355376	DELETE	product	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	{"id":"a68c2cca-ad2c-48b6-800b-682c9a4d05ab","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"12ca4977-1644-4586-b4b0-accba08fcffc","category":"tes","supplier_id":null,"brand_id":"6c8bcdc2-df74-417e-b875-d5080b50bd3c","name":"Tes","description":null,"price":"150000.00","cost":"75000.00","cost_price":"0.00","stock":93,"min_stock":5,"unit":"pcs","barcode":null,"sku":"tes-123","image":null,"brand":"tes","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-17T08:08:38.002Z","updated_at":"2026-08-17T08:08:38.002Z"}	\N	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 16:14:38.886396
5d04c3c8-55d5-4b28-b906-84689122a5ae	b07e47a5-7a93-4815-a52a-689417355376	DELETE	product	6f09b433-8da4-48cd-a124-23c5b4e905df	{"id":"6f09b433-8da4-48cd-a124-23c5b4e905df","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":null,"category":null,"supplier_id":null,"brand_id":null,"name":"a","description":null,"price":"125000.00","cost":"100000.00","cost_price":"0.00","stock":20,"min_stock":3,"unit":"pcs","barcode":null,"sku":"tes-123","image":null,"brand":null,"supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-19T21:48:03.846Z","updated_at":"2026-08-19T21:48:03.846Z"}	\N	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 16:14:41.234198
de792593-806f-46cd-9c0e-a6b001b15865	b07e47a5-7a93-4815-a52a-689417355376	UPDATE	product	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"eb2716c9-4271-491e-ba80-369d5b3d1cd3","category":"PARFUM","supplier_id":null,"brand_id":"c90ffd27-df79-4435-a77a-f7ea7bfdefd6","name":"N'CO PARFUM EDP 50ML","description":null,"price":"51000.00","cost":"60000.00","cost_price":"0.00","stock":9,"min_stock":3,"unit":"pcs","barcode":"8998824558444","sku":"PRD-OS9K0139","image":null,"brand":"NCO","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-18T19:53:31.179Z","updated_at":"2026-08-18T19:53:31.179Z"}	{"id":"c9c88daf-aa4e-46ce-94bf-dae82dace9e9","name":"N'CO PARFUM EDP 50ML","category":"PARFUM","brand":"NCO","price":65000,"costPrice":50000,"stock":9,"minStock":3,"sku":"PRD-OS9K0139","barcode":"8998824558444","image":"","createdAt":"2026-08-18T19:53:31.179Z","updatedAt":"2026-08-18T19:53:31.179Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":true,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned"}	182.9.200.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-20 16:15:21.045449
a599a8cc-9d84-4b4f-9ea9-3fbc2aff883b	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	87853ce8-6b28-4617-8cfa-7fe061471ade	\N	{"name":"Qman mainan lego","category":"Leho","brand":"Qman","price":29000,"costPrice":25000,"stock":12,"minStock":3,"sku":"6972885463901","barcode":"6972885463901","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	182.4.72.96	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	2026-08-22 01:07:18.244964
eb942c68-4214-49d6-84a9-7cccf9569131	b07e47a5-7a93-4815-a52a-689417355376	CREATE	product	42529235-3f12-4a5a-9ad7-0a16830bca46	\N	{"name":"MUSLIM MADANI KOKO PDK ","category":"KOKO PDK","brand":"MUSLIM MADANI","price":200000,"costPrice":145000,"stock":6,"minStock":2,"sku":"8993367100495","barcode":"8993367100495","description":"","image":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned","supplier":""}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-23 13:46:53.58068
5d4fa13e-aaa2-48ea-8331-c369a08c19ad	b07e47a5-7a93-4815-a52a-689417355376	CREATE	transaction	0cd1f43b-cb4a-435b-88fb-3d03f1e78603	\N	{"customerName":"Walk-in Customer","items":[{"productId":"42529235-3f12-4a5a-9ad7-0a16830bca46","productName":"MUSLIM MADANI KOKO PDK ","price":200000,"quantity":1,"subtotal":200000},{"productId":"eb79e3b0-978e-4b94-85d7-8a59416ac196","productName":"Stelan cargo cp boy","price":90000,"quantity":1,"subtotal":90000}],"subtotal":290000,"discount":20000,"tax":0,"total":270000,"paymentMethod":"cash","paymentAmount":289995,"changeAmount":19995,"status":"completed","latitude":-1.346619717788754,"longitude":100.58421510534691}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-23 14:14:06.829358
bd3d7580-fcb4-4410-b05c-fa505c3e6d00	b07e47a5-7a93-4815-a52a-689417355376	UPDATE	product	42529235-3f12-4a5a-9ad7-0a16830bca46	{"id":"42529235-3f12-4a5a-9ad7-0a16830bca46","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"3dda18d8-8509-4618-b110-bd763ed6906e","category":"KOKO PDK","supplier_id":null,"brand_id":"7ac95155-bb53-43f7-8bde-f78db288b082","name":"MUSLIM MADANI KOKO PDK ","description":null,"price":"200000.00","cost":"145000.00","cost_price":"0.00","stock":5,"min_stock":2,"unit":"pcs","barcode":"8993367100495","sku":"8993367100495","image":null,"brand":"MUSLIM MADANI","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":true,"created_at":"2026-08-23T06:46:53.575Z","updated_at":"2026-08-23T06:46:53.575Z"}	{"id":"42529235-3f12-4a5a-9ad7-0a16830bca46","name":"MUSLIM MADANI KOKO PDK ","category":"KOKO PDK","brand":"MUSLIM MADANI","price":200000,"costPrice":145000,"stock":6,"minStock":2,"sku":"8993367100495","barcode":"8993367100495","image":"","createdAt":"2026-08-23T06:46:53.575Z","updatedAt":"2026-08-23T06:46:53.575Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":true,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":true,"is_active":true,"product_type":"physical","ownership_type":"owned"}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-23 14:19:47.123372
2587d45a-a0ed-4961-bccd-30fa52c32bcb	b07e47a5-7a93-4815-a52a-689417355376	UPDATE	product	6eb3f9a7-459d-49d7-9530-55f9a69b7156	{"id":"6eb3f9a7-459d-49d7-9530-55f9a69b7156","user_id":"b07e47a5-7a93-4815-a52a-689417355376","category_id":"6f70564b-0184-4892-b353-f5ccbdaf9f10","category":"Lipstik","supplier_id":null,"brand_id":"0be3b65f-0ef1-4ad8-a55b-fe2ff0925960","name":"vaseline lip care pot","description":null,"price":"35000.00","cost":"28000.00","cost_price":"0.00","stock":15,"min_stock":3,"unit":"pcs","barcode":"305211231527","sku":"305211231527","image":null,"brand":"Vaseline","supplier":null,"product_type":"physical","ownership_type":"owned","is_active":true,"show_in_online_store":false,"created_at":"2026-08-20T00:47:36.477Z","updated_at":"2026-08-20T00:47:36.477Z"}	{"id":"6eb3f9a7-459d-49d7-9530-55f9a69b7156","name":"vaseline lip care pot","category":"Lipstik","brand":"Vaseline","price":35000,"costPrice":28000,"stock":16,"minStock":3,"sku":"305211231527","barcode":"305211231527","image":"","createdAt":"2026-08-20T00:47:36.477Z","updatedAt":"2026-08-20T00:47:36.477Z","productType":"physical","ownershipType":"owned","supplier":"","showInOnlineStore":false,"isActive":true,"isRawMaterial":false,"unit":"pcs","description":"","show_in_online_store":false,"is_active":true,"product_type":"physical","ownership_type":"owned"}	103.190.46.23	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-23 14:20:01.06769
\.


ALTER TABLE public.audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.brands DISABLE TRIGGER ALL;

COPY public.brands (id, user_id, name, description, created_at, updated_at) FROM stdin;
6c8bcdc2-df74-417e-b875-d5080b50bd3c	b07e47a5-7a93-4815-a52a-689417355376	tes	\N	2026-08-17 15:08:17.738614	2026-08-17 15:08:17.738614
0be3b65f-0ef1-4ad8-a55b-fe2ff0925960	b07e47a5-7a93-4815-a52a-689417355376	Vaseline	\N	2026-08-19 02:35:10.05721	2026-08-19 02:35:10.05721
c90ffd27-df79-4435-a77a-f7ea7bfdefd6	b07e47a5-7a93-4815-a52a-689417355376	NCO	\N	2026-08-19 02:53:25.103482	2026-08-19 02:53:25.103482
755b23f7-2678-4652-8589-69830c726d13	b07e47a5-7a93-4815-a52a-689417355376	Hone baby	\N	2026-08-20 08:05:43.187965	2026-08-20 08:05:43.187965
8aa3aa21-7493-4e33-b6e8-89ee6bd3425b	b07e47a5-7a93-4815-a52a-689417355376	Kaos kaki	\N	2026-08-20 08:18:41.252584	2026-08-20 08:18:41.252584
e8ac2ecb-d7c1-4f00-bbd8-e2f46c943d08	b07e47a5-7a93-4815-a52a-689417355376	Qman	\N	2026-08-22 01:03:23.324399	2026-08-22 01:03:23.324399
7ac95155-bb53-43f7-8bde-f78db288b082	b07e47a5-7a93-4815-a52a-689417355376	MUSLIM MADANI	\N	2026-08-23 13:45:49.580093	2026-08-23 13:45:49.580093
\.


ALTER TABLE public.brands ENABLE TRIGGER ALL;

--
-- Data for Name: cash_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.cash_shifts DISABLE TRIGGER ALL;

COPY public.cash_shifts (id, tenant_id, user_id, cashier_name, starting_cash, ending_cash, expected_cash, difference, total_cash_sales, total_non_cash_sales, total_sales, transaction_count, status, notes, opened_at, closed_at) FROM stdin;
\.


ALTER TABLE public.cash_shifts ENABLE TRIGGER ALL;

--
-- Data for Name: cashier_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.cashier_shifts DISABLE TRIGGER ALL;

COPY public.cashier_shifts (id, user_id, user_name, tenant_id, start_time, end_time, starting_cash, total_cash_sales, total_non_cash_sales, expected_cash, actual_cash, cash_difference, status, notes, created_at) FROM stdin;
\.


ALTER TABLE public.cashier_shifts ENABLE TRIGGER ALL;

--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.categories DISABLE TRIGGER ALL;

COPY public.categories (id, user_id, name, description, color, created_at, updated_at) FROM stdin;
12ca4977-1644-4586-b4b0-accba08fcffc	b07e47a5-7a93-4815-a52a-689417355376	tes	\N	#6366f1	2026-08-17 15:08:20.822241	2026-08-17 15:08:20.822241
6f70564b-0184-4892-b353-f5ccbdaf9f10	b07e47a5-7a93-4815-a52a-689417355376	Lipstik	\N	#6366f1	2026-08-19 02:35:47.959679	2026-08-19 02:35:47.959679
eb2716c9-4271-491e-ba80-369d5b3d1cd3	b07e47a5-7a93-4815-a52a-689417355376	PARFUM	\N	#6366f1	2026-08-19 02:53:26.824209	2026-08-19 02:53:26.824209
e79beabf-4bd3-40cc-90b5-02b6750732a4	b07e47a5-7a93-4815-a52a-689417355376	Stelan	\N	#6366f1	2026-08-20 08:05:54.449534	2026-08-20 08:05:54.449534
6884a212-9dfc-4b6e-bada-8687a25b6906	b07e47a5-7a93-4815-a52a-689417355376	Kaos kaki	\N	#6366f1	2026-08-20 08:20:13.280335	2026-08-20 08:20:13.280335
d6f1f33f-320b-4058-ab64-98e7430ebcec	b07e47a5-7a93-4815-a52a-689417355376	Leho	\N	#6366f1	2026-08-22 01:03:43.548512	2026-08-22 01:03:43.548512
3dda18d8-8509-4618-b110-bd763ed6906e	b07e47a5-7a93-4815-a52a-689417355376	KOKO PDK	\N	#6366f1	2026-08-23 13:46:00.108844	2026-08-23 13:46:00.108844
\.


ALTER TABLE public.categories ENABLE TRIGGER ALL;

--
-- Data for Name: company_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.company_assets DISABLE TRIGGER ALL;

COPY public.company_assets (id, user_id, code, name, category, purchase_date, purchase_cost, useful_life_years, salvage_value, notes, created_at) FROM stdin;
\.


ALTER TABLE public.company_assets ENABLE TRIGGER ALL;

--
-- Data for Name: consignment_settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.consignment_settlements DISABLE TRIGGER ALL;

COPY public.consignment_settlements (id, user_id, supplier_name, total_amount, total_quantity, settlement_date, period_start, period_end, notes, created_by, created_at) FROM stdin;
\.


ALTER TABLE public.consignment_settlements ENABLE TRIGGER ALL;

--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.customers DISABLE TRIGGER ALL;

COPY public.customers (id, user_id, name, email, phone, address, balance, total_purchases, total_spent, status, created_at, updated_at, notes, points, is_member, member_tier) FROM stdin;
\.


ALTER TABLE public.customers ENABLE TRIGGER ALL;

--
-- Data for Name: discussions; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.discussions DISABLE TRIGGER ALL;

COPY public.discussions (id, tenant_id, subject, message, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.discussions ENABLE TRIGGER ALL;

--
-- Data for Name: discussion_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.discussion_replies DISABLE TRIGGER ALL;

COPY public.discussion_replies (id, discussion_id, user_id, message, created_at) FROM stdin;
\.


ALTER TABLE public.discussion_replies ENABLE TRIGGER ALL;

--
-- Data for Name: employee_attendances; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.employee_attendances DISABLE TRIGGER ALL;

COPY public.employee_attendances (id, user_id, employee_name, date, clock_in, clock_out, status, notes, created_at) FROM stdin;
0e8a913e-3795-4dac-bb7d-a6bdb9594799	b07e47a5-7a93-4815-a52a-689417355376	toko@ryo.com	2026-08-17	2026-08-17 15:13:02.380025	\N	present		2026-08-17 15:13:02.380025
\.


ALTER TABLE public.employee_attendances ENABLE TRIGGER ALL;

--
-- Data for Name: employee_payrolls; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.employee_payrolls DISABLE TRIGGER ALL;

COPY public.employee_payrolls (id, user_id, employee_name, period, base_salary, bonus_commission, deductions, net_salary, status, paid_at, notes, created_at) FROM stdin;
\.


ALTER TABLE public.employee_payrolls ENABLE TRIGGER ALL;

--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.expense_categories DISABLE TRIGGER ALL;

COPY public.expense_categories (id, user_id, name, description, created_at) FROM stdin;
\.


ALTER TABLE public.expense_categories ENABLE TRIGGER ALL;

--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses DISABLE TRIGGER ALL;

COPY public.expenses (id, user_id, category_id, name, amount, date, notes, created_at, updated_at, category, expense_date, payment_method, description) FROM stdin;
\.


ALTER TABLE public.expenses ENABLE TRIGGER ALL;

--
-- Data for Name: income_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.income_costs DISABLE TRIGGER ALL;

COPY public.income_costs (id, income_id, description, amount, created_at) FROM stdin;
\.


ALTER TABLE public.income_costs ENABLE TRIGGER ALL;

--
-- Data for Name: incomes; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.incomes DISABLE TRIGGER ALL;

COPY public.incomes (id, user_id, title, client_name, project_name, description, amount, status, payment_method, income_date, due_date, paid_date, date, category, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.incomes ENABLE TRIGGER ALL;

--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.otp_codes DISABLE TRIGGER ALL;

COPY public.otp_codes (id, email, code, type, expires_at, is_used, created_at) FROM stdin;
\.


ALTER TABLE public.otp_codes ENABLE TRIGGER ALL;

--
-- Data for Name: point_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.point_history DISABLE TRIGGER ALL;

COPY public.point_history (id, tenant_id, customer_id, transaction_id, type, points, amount, notes, created_at) FROM stdin;
\.


ALTER TABLE public.point_history ENABLE TRIGGER ALL;

--
-- Data for Name: product_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.product_units DISABLE TRIGGER ALL;

COPY public.product_units (id, product_id, unit_name, conversion_qty, unit_price, unit_barcode, created_at) FROM stdin;
\.


ALTER TABLE public.product_units ENABLE TRIGGER ALL;

--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.products DISABLE TRIGGER ALL;

COPY public.products (id, user_id, category_id, category, supplier_id, brand_id, name, description, price, cost, cost_price, stock, min_stock, unit, barcode, sku, image, brand, supplier, product_type, ownership_type, is_active, show_in_online_store, created_at, updated_at) FROM stdin;
1af345a4-d577-4b0b-ab2c-b7710af96d8c	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	\N	\N	SANDRELLA EDP 100ML	\N	40000.00	38000.00	0.00	6	0	pcs	7779981024142	7	\N	\N	\N	physical	owned	t	f	2026-08-18 13:31:40.878897	2026-08-18 13:31:40.878897
eb79e3b0-978e-4b94-85d7-8a59416ac196	b07e47a5-7a93-4815-a52a-689417355376	e79beabf-4bd3-40cc-90b5-02b6750732a4	Stelan	\N	755b23f7-2678-4652-8589-69830c726d13	Stelan cargo cp boy	\N	90000.00	55000.00	0.00	10	3	pcs	222116524310	222116524310	/uploads/product-1787213252196-579219902.jpg	Hone baby	\N	physical	owned	t	t	2026-08-20 08:07:32.267444	2026-08-20 08:07:32.267444
42529235-3f12-4a5a-9ad7-0a16830bca46	b07e47a5-7a93-4815-a52a-689417355376	3dda18d8-8509-4618-b110-bd763ed6906e	KOKO PDK	\N	7ac95155-bb53-43f7-8bde-f78db288b082	MUSLIM MADANI KOKO PDK 	\N	200000.00	145000.00	0.00	6	2	pcs	8993367100495	8993367100495	\N	MUSLIM MADANI	\N	physical	owned	t	t	2026-08-23 13:46:53.575384	2026-08-23 13:46:53.575384
6eb3f9a7-459d-49d7-9530-55f9a69b7156	b07e47a5-7a93-4815-a52a-689417355376	6f70564b-0184-4892-b353-f5ccbdaf9f10	Lipstik	\N	0be3b65f-0ef1-4ad8-a55b-fe2ff0925960	vaseline lip care pot	\N	35000.00	28000.00	0.00	16	3	pcs	305211231527	305211231527	\N	Vaseline	\N	physical	owned	t	f	2026-08-20 07:47:36.477225	2026-08-20 07:47:36.477225
88e7c775-b008-43ce-9524-822a19cfca97	b07e47a5-7a93-4815-a52a-689417355376	6f70564b-0184-4892-b353-f5ccbdaf9f10	Lipstik	\N	0be3b65f-0ef1-4ad8-a55b-fe2ff0925960	Vasline lip care pot	\N	35000.00	27000.00	0.00	7	3	pcs	305210231597	305210231597	\N	Vaseline	\N	physical	owned	t	t	2026-08-19 02:36:35.926777	2026-08-19 02:36:35.926777
cf0512b1-b83f-472d-a6f4-d876f6a64787	b07e47a5-7a93-4815-a52a-689417355376	6884a212-9dfc-4b6e-bada-8687a25b6906	Kaos kaki	\N	8aa3aa21-7493-4e33-b6e8-89ee6bd3425b	Kaos kaki	\N	10000.00	7000.00	0.00	10	3	pcs	11187329000	11187329000	\N	Kaos kaki	\N	physical	owned	t	t	2026-08-20 08:37:03.829387	2026-08-20 08:37:03.829387
c9c88daf-aa4e-46ce-94bf-dae82dace9e9	b07e47a5-7a93-4815-a52a-689417355376	eb2716c9-4271-491e-ba80-369d5b3d1cd3	PARFUM	\N	c90ffd27-df79-4435-a77a-f7ea7bfdefd6	N'CO PARFUM EDP 50ML	\N	65000.00	50000.00	0.00	9	3	pcs	8998824558444	PRD-OS9K0139	\N	NCO	\N	physical	owned	t	t	2026-08-19 02:53:31.179732	2026-08-19 02:53:31.179732
87853ce8-6b28-4617-8cfa-7fe061471ade	b07e47a5-7a93-4815-a52a-689417355376	d6f1f33f-320b-4058-ab64-98e7430ebcec	Leho	\N	e8ac2ecb-d7c1-4f00-bbd8-e2f46c943d08	Qman mainan lego	\N	29000.00	25000.00	0.00	12	3	pcs	6972885463901	6972885463901	\N	Qman	\N	physical	owned	t	t	2026-08-22 01:07:18.243167	2026-08-22 01:07:18.243167
\.


ALTER TABLE public.products ENABLE TRIGGER ALL;

--
-- Data for Name: profit_distributions; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.profit_distributions DISABLE TRIGGER ALL;

COPY public.profit_distributions (id, user_id, period_month, period_year, total_revenue, total_costs, total_expenses, net_profit, owner_percentage, manager_percentage, store_percentage, owner_share, manager_share, store_share, notes, status, created_at) FROM stdin;
\.


ALTER TABLE public.profit_distributions ENABLE TRIGGER ALL;

--
-- Data for Name: profit_sharing_parties; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.profit_sharing_parties DISABLE TRIGGER ALL;

COPY public.profit_sharing_parties (id, setting_id, name, parts, created_at) FROM stdin;
\.


ALTER TABLE public.profit_sharing_parties ENABLE TRIGGER ALL;

--
-- Data for Name: profit_sharing_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.profit_sharing_settings DISABLE TRIGGER ALL;

COPY public.profit_sharing_settings (id, user_id, total_parts, owner_percentage, manager_percentage, store_percentage, owner_name, manager_name, created_at, updated_at) FROM stdin;
7214adda-70ca-4253-84ec-15e3cb762d54	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	10	40.00	30.00	30.00	\N	\N	2026-08-17 14:27:49.064456	2026-08-17 14:27:49.064456
6c2d972c-66c5-47b7-a821-e52668ee039d	b07e47a5-7a93-4815-a52a-689417355376	10	40.00	30.00	30.00	\N	\N	2026-08-17 15:12:40.294426	2026-08-17 15:12:40.294426
\.


ALTER TABLE public.profit_sharing_settings ENABLE TRIGGER ALL;

--
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.promo_codes DISABLE TRIGGER ALL;

COPY public.promo_codes (id, user_id, code, type, value, description, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.promo_codes ENABLE TRIGGER ALL;

--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_order_items DISABLE TRIGGER ALL;

COPY public.purchase_order_items (id, po_id, product_id, product_name, qty_ordered, qty_received, unit_cost, total) FROM stdin;
\.


ALTER TABLE public.purchase_order_items ENABLE TRIGGER ALL;

--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_orders DISABLE TRIGGER ALL;

COPY public.purchase_orders (id, user_id, po_number, supplier_id, supplier_name, status, payment_status, total_amount, paid_amount, due_date, notes, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.purchase_orders ENABLE TRIGGER ALL;

--
-- Data for Name: registration_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.registration_tokens DISABLE TRIGGER ALL;

COPY public.registration_tokens (id, token, created_by, status, used_by, used_at, created_at) FROM stdin;
5eee7d70-191d-4796-b6d1-d62da30dd460	REG-LOCAL-001	\N	unused	\N	\N	2026-08-17 10:46:49.595332
\.


ALTER TABLE public.registration_tokens ENABLE TRIGGER ALL;

--
-- Data for Name: reinvestment_balance; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.reinvestment_balance DISABLE TRIGGER ALL;

COPY public.reinvestment_balance (id, user_id, total_in, total_out, current_balance, created_at, updated_at) FROM stdin;
6f536b8a-2d58-468f-8004-6a07853f2bc2	b7b3a60f-86b9-4a55-9f07-65db9e88d5b1	0.00	0.00	0.00	2026-08-17 14:27:49.86797	2026-08-17 14:27:49.86797
2c109287-3d72-4821-bc25-82753e974e0f	b07e47a5-7a93-4815-a52a-689417355376	0.00	0.00	0.00	2026-08-17 15:12:40.677833	2026-08-17 15:12:40.677833
\.


ALTER TABLE public.reinvestment_balance ENABLE TRIGGER ALL;

--
-- Data for Name: reinvestment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.reinvestment_plans DISABLE TRIGGER ALL;

COPY public.reinvestment_plans (id, user_id, title, amount, target_date, status, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.reinvestment_plans ENABLE TRIGGER ALL;

--
-- Data for Name: reinvestment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.reinvestment_transactions DISABLE TRIGGER ALL;

COPY public.reinvestment_transactions (id, user_id, distribution_id, type, amount, source, description, reference_id, transaction_date, created_by, created_at) FROM stdin;
\.


ALTER TABLE public.reinvestment_transactions ENABLE TRIGGER ALL;

--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.settings DISABLE TRIGGER ALL;

COPY public.settings (id, user_id, business_name, business_address, business_phone, business_email, business_logo, tax_rate, currency, receipt_template, receipt_footer, auto_backup, online_store_enabled, created_at, updated_at, default_discount, print_receipt, low_stock_notification, logo_url, description, min_spend_for_member, point_rate, point_value, gold_threshold, platinum_threshold) FROM stdin;
a12ebdfd-a0fe-4526-b0b1-2346fb76c073	b2d350d3-bf23-4bb6-b1c2-9635a1858cb6	Admin		082390666669		\N	0.00	IDR	default	Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat\ndikembalikan atau ditukar.	f	f	2026-08-17 13:19:29.7378	2026-08-17 13:19:29.7378	0.00	t	t	\N	\N	100000.00	10000.00	100.00	1000000.00	5000000.00
55a584df-db7f-4b4f-8a3a-bf9c3fa2254f	b07e47a5-7a93-4815-a52a-689417355376	Toko Ryo	PERLENGKAPAN BAYI & COSMETIK\nJl.Prof.Dr.Hamka Rawang Painan\nPAINAN	081374762948		\N	0.00	IDR	default	Terima kasih\nSelamat Datang Kembali ke Toko\nKami	f	t	2026-08-17 11:11:53.163173	2026-08-17 11:11:53.163173	0.00	t	t	\N	\N	100000.00	10000.00	100.00	1000000.00	5000000.00
\.


ALTER TABLE public.settings ENABLE TRIGGER ALL;

--
-- Data for Name: smtp_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.smtp_settings DISABLE TRIGGER ALL;

COPY public.smtp_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, created_at, updated_at) FROM stdin;
58cd976f-7b7a-49f9-8432-623c3c08c22b	smtp.gmail.com	465	\N	\N	t	2026-08-17 11:10:31.269812	2026-08-17 11:10:31.269812
\.


ALTER TABLE public.smtp_settings ENABLE TRIGGER ALL;

--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_movements DISABLE TRIGGER ALL;

COPY public.stock_movements (id, user_id, product_id, type, quantity, before_stock, after_stock, stock_before, stock_after, reference_type, reference_id, notes, created_by, created_at) FROM stdin;
53d9fe9c-c610-4be7-bcee-17eb997e4968	b07e47a5-7a93-4815-a52a-689417355376	1af345a4-d577-4b0b-ab2c-b7710af96d8c	in	10	0	0	0	10	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-18 13:31:40.881496
a6a376ee-01a2-41d0-a8b9-e15787e8a4e5	b07e47a5-7a93-4815-a52a-689417355376	1af345a4-d577-4b0b-ab2c-b7710af96d8c	sale	1	0	0	10	9	transaction	d0e6fa4d-d0a5-48ad-ac3f-1322ba4c313a	Sale: SANDRELLA EDP 100ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-18 13:32:14.08088
51169e06-d35a-4b94-8301-4c87ef8e4d92	b07e47a5-7a93-4815-a52a-689417355376	1af345a4-d577-4b0b-ab2c-b7710af96d8c	sale	1	0	0	9	8	transaction	dd42653e-c28c-4952-9d69-3ca803eddf96	Sale: SANDRELLA EDP 100ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-18 13:39:44.463859
4a768027-9475-45b2-901d-5d177eb8caca	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	in	12	0	0	0	12	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 02:36:35.929535
3df229fe-e12b-48df-ace7-7af781ffe0e0	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	sale	1	0	0	12	11	transaction	7448b0bb-5e2f-4bfe-b953-104e5120fdab	Sale: Vasline lip care pot x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 02:37:23.391001
3bc0db69-428d-476e-bb42-8a5d98f8c365	b07e47a5-7a93-4815-a52a-689417355376	1af345a4-d577-4b0b-ab2c-b7710af96d8c	sale	1	0	0	8	7	transaction	35c1c3a5-b679-47b6-9ab3-3e40fd47a5ac	Sale: SANDRELLA EDP 100ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 03:32:28.454821
50620f09-fbfa-44c8-a73b-d6b8e8ee599d	b07e47a5-7a93-4815-a52a-689417355376	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	adjustment	12	0	0	0	12	manual	\N	Stock adjusted from 0 to 12	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 06:33:50.567964
59f3a165-5ac4-47ce-ac7d-64224824a49f	b07e47a5-7a93-4815-a52a-689417355376	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	sale	1	0	0	12	11	transaction	d9d4432a-98e6-4b2b-844f-1d6ea4223e3f	Sale: N"CO EDP 50ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 06:34:01.884526
6ea34a74-a9c6-469a-b023-f5b62aff3b18	b07e47a5-7a93-4815-a52a-689417355376	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	sale	1	0	0	11	10	transaction	8f549c4c-7eba-4078-8bb9-a6ec12715025	Sale: N"CO EDP 50ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-19 06:37:07.290088
8dff2aa6-052e-41fb-b4cf-bcce7979114e	b07e47a5-7a93-4815-a52a-689417355376	1af345a4-d577-4b0b-ab2c-b7710af96d8c	sale	1	0	0	7	6	transaction	777a4a83-9c51-4bfe-9f77-899c386333db	Sale: SANDRELLA EDP 100ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 04:45:24.823826
507120d9-01df-49ef-b02e-477d4ed86010	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	sale	1	0	0	11	10	transaction	777a4a83-9c51-4bfe-9f77-899c386333db	Sale: Vasline lip care pot x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 04:45:24.823826
633c54c7-0c56-444f-8802-8799553e3f1f	b07e47a5-7a93-4815-a52a-689417355376	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	sale	1	0	0	10	9	transaction	777a4a83-9c51-4bfe-9f77-899c386333db	Sale: N'CO PARFUM EDP 50ML x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 04:45:24.823826
65e384c7-1ce7-4651-b4ba-c175c546e2c2	b07e47a5-7a93-4815-a52a-689417355376	6eb3f9a7-459d-49d7-9530-55f9a69b7156	in	15	0	0	0	15	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 07:47:36.480267
83994415-acae-413f-b6a9-5c60f5e4a1f8	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	sale	1	0	0	10	9	transaction	dd1fcb85-09ea-4350-8baf-8f2ada68b4fe	Sale: Vasline lip care pot x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 07:51:01.907395
97f457a5-a4b5-47b5-b5f9-81460b627547	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	sale	1	0	0	9	8	transaction	75217e73-1693-4609-8d15-060589b36de5	Sale: Vasline lip care pot x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 07:56:28.261266
28b300c5-809b-4762-bb20-53256e7b5cd7	b07e47a5-7a93-4815-a52a-689417355376	88e7c775-b008-43ce-9524-822a19cfca97	sale	1	0	0	8	7	transaction	ee014d69-b14b-4d88-8eba-7e20273b057d	Sale: Vasline lip care pot x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 07:57:56.237119
95ef84c6-ed19-455d-acc1-8656831e425f	b07e47a5-7a93-4815-a52a-689417355376	eb79e3b0-978e-4b94-85d7-8a59416ac196	in	12	0	0	0	12	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 08:07:32.270558
516052bc-a4b5-4660-a421-772320514b0b	b07e47a5-7a93-4815-a52a-689417355376	eb79e3b0-978e-4b94-85d7-8a59416ac196	sale	1	0	0	12	11	transaction	cdff7188-f38f-413a-9eee-146748e75db6	Sale: Stelan cargo cp boy x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 08:08:27.468681
48206fc9-30cd-4d2e-98f9-70eb9b143281	b07e47a5-7a93-4815-a52a-689417355376	cf0512b1-b83f-472d-a6f4-d876f6a64787	in	12	0	0	0	12	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 08:37:03.832426
420e47d6-d374-4a23-b2a6-b7d7e02b6c51	b07e47a5-7a93-4815-a52a-689417355376	cf0512b1-b83f-472d-a6f4-d876f6a64787	sale	1	0	0	12	11	transaction	c9fd1f59-a4ca-46c3-a339-80b199480f93	Sale: Kaos kaki x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 08:37:37.445038
5b43f390-6f1b-49e0-af2c-437c96bfa2cf	b07e47a5-7a93-4815-a52a-689417355376	cf0512b1-b83f-472d-a6f4-d876f6a64787	sale	1	0	0	11	10	transaction	0090d4ad-34e4-4c12-a414-a8b017114fb2	Sale: Kaos kaki x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-20 08:38:58.179422
cad7b6da-1f9a-4206-9ea1-ce41dc53cecd	b07e47a5-7a93-4815-a52a-689417355376	87853ce8-6b28-4617-8cfa-7fe061471ade	in	12	0	0	0	12	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-22 01:07:18.246567
6cce066c-d9b4-40a5-9310-db9ace543d56	b07e47a5-7a93-4815-a52a-689417355376	42529235-3f12-4a5a-9ad7-0a16830bca46	in	6	0	0	0	6	initial	\N	Initial stock on product creation	b07e47a5-7a93-4815-a52a-689417355376	2026-08-23 13:46:53.586458
96833616-00a3-48e0-9558-9938d2b14a31	b07e47a5-7a93-4815-a52a-689417355376	42529235-3f12-4a5a-9ad7-0a16830bca46	sale	1	0	0	6	5	transaction	0cd1f43b-cb4a-435b-88fb-3d03f1e78603	Sale: MUSLIM MADANI KOKO PDK  x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-23 14:14:06.812952
b8e3f34d-eaaf-46c0-a0f2-d39adf12bcb9	b07e47a5-7a93-4815-a52a-689417355376	eb79e3b0-978e-4b94-85d7-8a59416ac196	sale	1	0	0	11	10	transaction	0cd1f43b-cb4a-435b-88fb-3d03f1e78603	Sale: Stelan cargo cp boy x1	b07e47a5-7a93-4815-a52a-689417355376	2026-08-23 14:14:06.812952
439c5521-59f3-4d77-8c9a-3f448b9c9372	b07e47a5-7a93-4815-a52a-689417355376	42529235-3f12-4a5a-9ad7-0a16830bca46	adjustment	1	0	0	5	6	manual	\N	Stock adjusted from 5 to 6	b07e47a5-7a93-4815-a52a-689417355376	2026-08-23 14:19:47.1247
a4b9b4e7-2767-4d3f-b672-05dba99db5b0	b07e47a5-7a93-4815-a52a-689417355376	6eb3f9a7-459d-49d7-9530-55f9a69b7156	adjustment	1	0	0	15	16	manual	\N	Stock adjusted from 15 to 16	b07e47a5-7a93-4815-a52a-689417355376	2026-08-23 14:20:01.069006
\.


ALTER TABLE public.stock_movements ENABLE TRIGGER ALL;

--
-- Data for Name: stock_opname_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_opname_items DISABLE TRIGGER ALL;

COPY public.stock_opname_items (id, opname_id, product_id, product_name, product_sku, system_stock, physical_stock, difference_qty, unit_cost, difference_value, notes) FROM stdin;
\.


ALTER TABLE public.stock_opname_items ENABLE TRIGGER ALL;

--
-- Data for Name: stock_opnames; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_opnames DISABLE TRIGGER ALL;

COPY public.stock_opnames (id, user_id, opname_number, outlet_id, title, status, notes, created_by, completed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.stock_opnames ENABLE TRIGGER ALL;

--
-- Data for Name: store_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.store_customers DISABLE TRIGGER ALL;

COPY public.store_customers (id, name, email, password, phone, address, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.store_customers ENABLE TRIGGER ALL;

--
-- Data for Name: store_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.store_order_items DISABLE TRIGGER ALL;

COPY public.store_order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal, created_at) FROM stdin;
\.


ALTER TABLE public.store_order_items ENABLE TRIGGER ALL;

--
-- Data for Name: store_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.store_orders DISABLE TRIGGER ALL;

COPY public.store_orders (id, tenant_id, store_customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, payment_method, payment_proof, status, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.store_orders ENABLE TRIGGER ALL;

--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers DISABLE TRIGGER ALL;

COPY public.suppliers (id, user_id, name, contact_name, email, phone, address, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.suppliers ENABLE TRIGGER ALL;

--
-- Data for Name: system_announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.system_announcements DISABLE TRIGGER ALL;

COPY public.system_announcements (id, message, type, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.system_announcements ENABLE TRIGGER ALL;

--
-- Data for Name: transaction_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.transaction_items DISABLE TRIGGER ALL;

COPY public.transaction_items (id, transaction_id, product_id, product_name, quantity, price, unit_price, cost_price, subtotal, consignment_settlement_id, created_at) FROM stdin;
33378741-e127-4509-bcb4-f33f9471b307	620b74dc-1c25-44cd-bb5e-dfea3601bc47	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-17 15:11:57.9675
b2fd7e9c-be60-44bb-bb48-29cc837f896f	ac77dbc3-0bec-470f-882f-ffc72256b8e7	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-17 15:14:02.840165
04bae5b5-a976-47b6-a35e-976fa522d85b	d0e6fa4d-d0a5-48ad-ac3f-1322ba4c313a	1af345a4-d577-4b0b-ab2c-b7710af96d8c	SANDRELLA EDP 100ML	1	40000.00	0.00	0.00	40000.00	\N	2026-08-18 13:32:14.08088
dfc18934-74b9-484d-8119-bbab938ca8f2	894fbea9-0a37-401d-b370-a9552a98c4c9	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-18 13:36:12.894487
a4b4dc8a-6c93-4e7c-abbd-0d2c7b43a759	dd42653e-c28c-4952-9d69-3ca803eddf96	1af345a4-d577-4b0b-ab2c-b7710af96d8c	SANDRELLA EDP 100ML	1	40000.00	0.00	0.00	40000.00	\N	2026-08-18 13:39:44.463859
eeac5f31-1335-4aa6-8929-ada44f60b85d	dd42653e-c28c-4952-9d69-3ca803eddf96	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-18 13:39:44.463859
9d7b1b4e-8021-4e4f-9e1f-4d4024f9727c	e8593c35-680b-4381-9979-9df4c198b3df	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-18 13:51:34.038039
fbb0d2e5-6c5f-455c-a4d3-bc0f8e600ef4	61acc284-51d5-402e-adaf-f3ad9a8f782e	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-18 13:52:58.606853
9d71f341-76d9-4aa5-b27a-e0b74bb72e18	7448b0bb-5e2f-4bfe-b953-104e5120fdab	88e7c775-b008-43ce-9524-822a19cfca97	Vasline lip care pot	1	35000.00	0.00	0.00	35000.00	\N	2026-08-19 02:37:23.391001
b4b0584f-69ed-4220-8633-20e26c4b0200	35c1c3a5-b679-47b6-9ab3-3e40fd47a5ac	1af345a4-d577-4b0b-ab2c-b7710af96d8c	SANDRELLA EDP 100ML	1	40000.00	0.00	0.00	40000.00	\N	2026-08-19 03:32:28.454821
db9fe95b-948f-4d8b-86a3-b8bb2428f898	d9d4432a-98e6-4b2b-844f-1d6ea4223e3f	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	N"CO EDP 50ML	1	50000.00	0.00	0.00	50000.00	\N	2026-08-19 06:34:01.884526
804f3506-e92c-41ae-b9fa-82ec82da5c98	8f549c4c-7eba-4078-8bb9-a6ec12715025	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	N"CO EDP 50ML	1	50000.00	0.00	0.00	50000.00	\N	2026-08-19 06:37:07.290088
c784ee0f-c69d-4fed-8a95-c2dd3a0853e4	777a4a83-9c51-4bfe-9f77-899c386333db	a68c2cca-ad2c-48b6-800b-682c9a4d05ab	Tes	1	150000.00	0.00	0.00	150000.00	\N	2026-08-20 04:45:24.823826
2f93401f-153c-490c-8444-6fe2dd44e0fb	777a4a83-9c51-4bfe-9f77-899c386333db	1af345a4-d577-4b0b-ab2c-b7710af96d8c	SANDRELLA EDP 100ML	1	40000.00	0.00	0.00	40000.00	\N	2026-08-20 04:45:24.823826
cabc8bee-ecfc-44c0-8a8c-35c286dad5f3	777a4a83-9c51-4bfe-9f77-899c386333db	88e7c775-b008-43ce-9524-822a19cfca97	Vasline lip care pot	1	35000.00	0.00	0.00	35000.00	\N	2026-08-20 04:45:24.823826
dca98002-6c1b-44d7-bc81-c6592c171c2c	777a4a83-9c51-4bfe-9f77-899c386333db	c9c88daf-aa4e-46ce-94bf-dae82dace9e9	N'CO PARFUM EDP 50ML	1	51000.00	0.00	0.00	51000.00	\N	2026-08-20 04:45:24.823826
046448fe-bf49-42ef-83a8-eb3f9a565985	dd1fcb85-09ea-4350-8baf-8f2ada68b4fe	88e7c775-b008-43ce-9524-822a19cfca97	Vasline lip care pot	1	35000.00	0.00	0.00	35000.00	\N	2026-08-20 07:51:01.907395
72b72716-99b2-4d52-93e3-ce9488f7e0aa	75217e73-1693-4609-8d15-060589b36de5	88e7c775-b008-43ce-9524-822a19cfca97	Vasline lip care pot	1	35000.00	0.00	0.00	35000.00	\N	2026-08-20 07:56:28.261266
10990f48-5942-4770-9335-fcf234950ab6	ee014d69-b14b-4d88-8eba-7e20273b057d	88e7c775-b008-43ce-9524-822a19cfca97	Vasline lip care pot	1	35000.00	0.00	0.00	35000.00	\N	2026-08-20 07:57:56.237119
cbea08a9-7951-46db-9101-9acbd50def74	cdff7188-f38f-413a-9eee-146748e75db6	eb79e3b0-978e-4b94-85d7-8a59416ac196	Stelan cargo cp boy	1	90000.00	0.00	0.00	90000.00	\N	2026-08-20 08:08:27.468681
48f4e401-9f2d-437f-a972-a435581d1062	c9fd1f59-a4ca-46c3-a339-80b199480f93	cf0512b1-b83f-472d-a6f4-d876f6a64787	Kaos kaki	1	10000.00	0.00	0.00	10000.00	\N	2026-08-20 08:37:37.445038
6f2798ed-3779-4933-bf98-07a85d1e44c4	0090d4ad-34e4-4c12-a414-a8b017114fb2	cf0512b1-b83f-472d-a6f4-d876f6a64787	Kaos kaki	1	10000.00	0.00	0.00	10000.00	\N	2026-08-20 08:38:58.179422
d6988eb2-3e22-4e43-bc57-5be17de9cf23	0cd1f43b-cb4a-435b-88fb-3d03f1e78603	42529235-3f12-4a5a-9ad7-0a16830bca46	MUSLIM MADANI KOKO PDK 	1	200000.00	0.00	0.00	200000.00	\N	2026-08-23 14:14:06.812952
1eb8f049-3474-4d87-9dc9-ef91c86d4bd6	0cd1f43b-cb4a-435b-88fb-3d03f1e78603	eb79e3b0-978e-4b94-85d7-8a59416ac196	Stelan cargo cp boy	1	90000.00	0.00	0.00	90000.00	\N	2026-08-23 14:14:06.812952
\.


ALTER TABLE public.transaction_items ENABLE TRIGGER ALL;

--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.transactions DISABLE TRIGGER ALL;

COPY public.transactions (id, user_id, shift_id, customer_id, customer_name, invoice_number, subtotal, tax, total_amount, total, discount, tax_amount, final_amount, payment_method, payment_amount, amount_paid, change_amount, promo_code, promo_discount, cashier_name, store_order_id, notes, status, latitude, longitude, created_at, updated_at) FROM stdin;
620b74dc-1c25-44cd-bb5e-dfea3601bc47	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260817-01-0001	150000.00	0.00	0.00	142500.00	7500.00	0.00	0.00	cash	150000.00	0.00	7500.00	\N	0.00	Toko Ryo	\N	\N	completed	-0.94193700	100.36629500	2026-08-17 22:11:57.968	2026-08-17 15:11:57.9675
ac77dbc3-0bec-470f-882f-ffc72256b8e7	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260817-01-0002	150000.00	0.00	0.00	150000.00	0.00	0.00	0.00	transfer	150000.00	0.00	0.00	\N	0.00	Admin 01	\N	\N	completed	-0.94197350	100.36630250	2026-08-17 22:14:02.841	2026-08-17 15:14:02.840165
d0e6fa4d-d0a5-48ad-ac3f-1322ba4c313a	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260818-01-0001	40000.00	0.00	0.00	40000.00	0.00	0.00	0.00	cash	40000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34678064	100.58387456	2026-08-18 20:32:14.082	2026-08-18 13:32:14.08088
894fbea9-0a37-401d-b370-a9552a98c4c9	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260818-01-0002	150000.00	0.00	0.00	150000.00	0.00	0.00	0.00	cash	150000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34678064	100.58387456	2026-08-18 20:36:12.895	2026-08-18 13:36:12.894487
dd42653e-c28c-4952-9d69-3ca803eddf96	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260818-01-0003	190000.00	0.00	0.00	190000.00	0.00	0.00	0.00	cash	190000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34678064	100.58387456	2026-08-18 20:39:44.464	2026-08-18 13:39:44.463859
e8593c35-680b-4381-9979-9df4c198b3df	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260818-01-0004	150000.00	0.00	0.00	150000.00	0.00	0.00	0.00	cash	150000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34678064	100.58387456	2026-08-18 20:51:34.038	2026-08-18 13:51:34.038039
61acc284-51d5-402e-adaf-f3ad9a8f782e	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260818-01-0005	150000.00	0.00	0.00	150000.00	0.00	0.00	0.00	cash	150000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34678064	100.58387456	2026-08-18 20:52:58.608	2026-08-18 13:52:58.606853
7448b0bb-5e2f-4bfe-b953-104e5120fdab	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260819-01-0001	35000.00	0.00	0.00	35000.00	0.00	0.00	0.00	cash	35000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34668690	100.58422380	2026-08-19 09:37:23.392	2026-08-19 02:37:23.391001
35c1c3a5-b679-47b6-9ab3-3e40fd47a5ac	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260819-01-0002	40000.00	0.00	0.00	40000.00	0.00	0.00	0.00	cash	40000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34680858	100.58380773	2026-08-19 10:32:28.455	2026-08-19 03:32:28.454821
d9d4432a-98e6-4b2b-844f-1d6ea4223e3f	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260819-01-0003	50000.00	0.00	0.00	50000.00	0.00	0.00	0.00	cash	50000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34674262	100.58398151	2026-08-19 13:34:01.885	2026-08-19 06:34:01.884526
8f549c4c-7eba-4078-8bb9-a6ec12715025	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260819-01-0004	50000.00	0.00	0.00	50000.00	0.00	0.00	0.00	cash	50000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34674262	100.58398151	2026-08-19 13:37:07.291	2026-08-19 06:37:07.290088
777a4a83-9c51-4bfe-9f77-899c386333db	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0001	276000.00	0.00	0.00	276000.00	0.00	0.00	0.00	cash	300000.00	0.00	24000.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34677982	100.58392364	2026-08-20 11:45:24.824	2026-08-20 04:45:24.823826
dd1fcb85-09ea-4350-8baf-8f2ada68b4fe	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0002	35000.00	0.00	0.00	35000.00	0.00	0.00	0.00	cash	35000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	\N	\N	2026-08-20 14:51:01.908	2026-08-20 07:51:01.907395
75217e73-1693-4609-8d15-060589b36de5	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0003	35000.00	0.00	0.00	35000.00	0.00	0.00	0.00	cash	35000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34668760	100.58422180	2026-08-20 14:56:28.262	2026-08-20 07:56:28.261266
ee014d69-b14b-4d88-8eba-7e20273b057d	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0004	35000.00	0.00	0.00	35000.00	0.00	0.00	0.00	cash	35000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34669070	100.58421410	2026-08-20 14:57:56.238	2026-08-20 07:57:56.237119
cdff7188-f38f-413a-9eee-146748e75db6	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0005	90000.00	0.00	0.00	90000.00	0.00	0.00	0.00	cash	90000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34667970	100.58423120	2026-08-20 15:08:27.469	2026-08-20 08:08:27.468681
c9fd1f59-a4ca-46c3-a339-80b199480f93	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0006	10000.00	0.00	0.00	10000.00	0.00	0.00	0.00	cash	10000.00	0.00	0.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34668520	100.58422120	2026-08-20 15:37:37.446	2026-08-20 08:37:37.445038
0090d4ad-34e4-4c12-a414-a8b017114fb2	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260820-01-0007	10000.00	0.00	0.00	10000.00	0.00	0.00	0.00	cash	50000.00	0.00	40000.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34669200	100.58421870	2026-08-20 15:38:58.18	2026-08-20 08:38:58.179422
0cd1f43b-cb4a-435b-88fb-3d03f1e78603	b07e47a5-7a93-4815-a52a-689417355376	\N	\N	Walk-in Customer	TRX-20260823-01-0001	290000.00	0.00	0.00	270000.00	20000.00	0.00	0.00	cash	289995.00	0.00	19995.00	\N	0.00	Toko Ryo	\N	\N	completed	-1.34661972	100.58421511	2026-08-23 21:14:06.815	2026-08-23 14:14:06.812952
\.


ALTER TABLE public.transactions ENABLE TRIGGER ALL;

--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles DISABLE TRIGGER ALL;

COPY public.user_roles (id, user_id, role, created_at) FROM stdin;
\.


ALTER TABLE public.user_roles ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

COPY public.users (id, email, password, full_name, role, tenant_id, shop_slug, subscription_tier, subscription_expires_at, max_products, max_transactions, created_at, updated_at) FROM stdin;
fdbad7ac-f7a9-4254-b37b-fe1a218b0bc6	admin01@ryo.com	$2a$10$ZeWV/Ux0z02eY2HeusQyzupUdQM3065IxFQfPXHbnM1c47GqthUPi	Admin 01	kasir	b07e47a5-7a93-4815-a52a-689417355376	tokoryo	free	\N	100	1000	2026-08-17 15:13:43.309744	2026-08-17 15:13:43.309744
b07e47a5-7a93-4815-a52a-689417355376	toko@ryo.com	$2b$10$lxmF1eQDXuf40h4/vtFisORy2q5zNJgPbHEdPZRPyHJNeBbh2SiHi	Toko Ryo	admin	b07e47a5-7a93-4815-a52a-689417355376	ryo	free	\N	100	1000	2026-08-17 11:11:53.161231	2026-08-17 11:11:53.161231
b2d350d3-bf23-4bb6-b1c2-9635a1858cb6	mas@abd.com	$2b$10$fp2cEHp2DUHyUPciAt65IuDf8/twa5BT32UYeE.fwAOYCw1NuGsLW	Super Admin	super_admin	b2d350d3-bf23-4bb6-b1c2-9635a1858cb6	\N	free	\N	100	1000	2026-08-17 10:46:49.591188	2026-08-17 10:46:49.591188
\.


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--


