-- Integration checks use synthetic users only inside a rolled-back transaction.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f1000000-0000-4000-8000-000000000001','business-a@onlyshop-ci.invalid','{"username":"business_test_a"}'),
 ('f1000000-0000-4000-8000-000000000002','business-b@onlyshop-ci.invalid','{"username":"business_test_b"}'),
 ('f1000000-0000-4000-8000-000000000003','business-c@onlyshop-ci.invalid','{"username":"business_test_c"}');
INSERT INTO public.follows(follower_id,following_id) VALUES
 ('f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002'),
 ('f1000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000001');
INSERT INTO public.business_posts(id,user_id,content,media_path) VALUES('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Private test post','f1000000-0000-4000-8000-000000000001/test');
INSERT INTO storage.objects(bucket_id,name) VALUES('business-media','f1000000-0000-4000-8000-000000000001/test');
INSERT INTO brands(id,user_id,name,slug) VALUES('f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','Business test brand','business-integration-test');
INSERT INTO campaigns(id,brand_id,name,reward_type,reward_amount,slots,platform_fee_pct,total_budget,funded,pay_mode,status)
 VALUES('f3000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000001','Verified business test','per_video',10,1,20,12,true,'escrow','active');
INSERT INTO campaign_applications(id,campaign_id,influencer_user_id,status) VALUES('f3000000-0000-4000-8000-000000000003','f3000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000001','accepted');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
INSERT INTO storage.objects(bucket_id,name) VALUES('business-media','f1000000-0000-4000-8000-000000000001/unpublished') RETURNING id;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
DO $$ DECLARE first_chat uuid; second_chat uuid; BEGIN
 IF (SELECT count(*) FROM business_posts WHERE id='f2000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Mutual connection cannot read post'; END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='business-media' AND name='f1000000-0000-4000-8000-000000000001/test')<>1 THEN RAISE EXCEPTION 'Mutual connection cannot read image'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='business-media' AND name='f1000000-0000-4000-8000-000000000001/unpublished') THEN RAISE EXCEPTION 'Mutual connection read an unpublished image'; END IF;
 first_chat:=public.start_business_conversation('f1000000-0000-4000-8000-000000000001',NULL);
 second_chat:=public.start_business_conversation('f1000000-0000-4000-8000-000000000001',NULL);
 IF first_chat<>second_chat THEN RAISE EXCEPTION 'Conversation duplicated'; END IF;
 IF public.start_business_conversation(NULL,'f3000000-0000-4000-8000-000000000003')<>first_chat THEN RAISE EXCEPTION 'Campaign chat did not resolve the same two parties'; END IF;
 IF (SELECT count(*) FROM conversation_participants WHERE conversation_id=first_chat)<>2 THEN RAISE EXCEPTION 'Conversation not created atomically'; END IF;
 INSERT INTO messages(conversation_id,sender_id,content) VALUES(first_chat,auth.uid(),'Private test message');
 BEGIN
  UPDATE conversation_participants SET user_id='f1000000-0000-4000-8000-000000000003' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'Participant identity can be forged';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO ratings(application_id,rater_user_id,rated_user_id,stars) VALUES('f3000000-0000-4000-8000-000000000003',auth.uid(),'f1000000-0000-4000-8000-000000000001',5);
  RAISE EXCEPTION 'Unfinished partnership received rating';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 INSERT INTO campaign_applications(id,campaign_id,influencer_user_id,status,accepted_at,completed_at) VALUES('f3000000-0000-4000-8000-000000000004','f3000000-0000-4000-8000-000000000002',auth.uid(),'approved','2000-01-01','2000-01-01');
 IF NOT EXISTS(SELECT 1 FROM campaign_applications WHERE id='f3000000-0000-4000-8000-000000000004' AND status='applied' AND accepted_at IS NULL AND completed_at IS NULL) THEN RAISE EXCEPTION 'Client forged a completion or acceptance timestamp'; END IF;
 IF EXISTS(SELECT 1 FROM business_posts WHERE id='f2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Outsider read private post'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='business-media' AND name='f1000000-0000-4000-8000-000000000001/test') THEN RAISE EXCEPTION 'Outsider read private image'; END IF;
 IF EXISTS(SELECT 1 FROM messages WHERE content='Private test message') THEN RAISE EXCEPTION 'Outsider read private chat'; END IF;
 BEGIN
  PERFORM public.start_business_conversation('f1000000-0000-4000-8000-000000000001',NULL);
  RAISE EXCEPTION 'Outsider started chat';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.start_business_conversation(NULL,'f3000000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Outsider opened another campaign chat';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO business_likes(post_id,user_id) VALUES('f2000000-0000-4000-8000-000000000001',auth.uid());
  RAISE EXCEPTION 'Outsider liked private post';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO ratings(application_id,rater_user_id,rated_user_id,stars) VALUES('f2000000-0000-4000-8000-000000000002',auth.uid(),'f1000000-0000-4000-8000-000000000001',5);
  RAISE EXCEPTION 'Unrelated user forged a rating';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
DELETE FROM follows WHERE follower_id=auth.uid() AND following_id='f1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM business_posts WHERE id='f2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Post still accessible after unfollow'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='business-media' AND name='f1000000-0000-4000-8000-000000000001/test') THEN RAISE EXCEPTION 'Image still accessible after unfollow'; END IF;
 IF NOT EXISTS(SELECT 1 FROM messages WHERE content='Private test message') THEN RAISE EXCEPTION 'Private history disappeared after unfollow'; END IF;
END $$;
RESET ROLE;
UPDATE campaign_applications SET status='delivered',delivery_url='https://example.com/test-proof' WHERE id='f3000000-0000-4000-8000-000000000003';
UPDATE campaign_applications SET status='approved' WHERE id='f3000000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
INSERT INTO ratings(application_id,rater_user_id,rated_user_id,stars) VALUES('f3000000-0000-4000-8000-000000000003',auth.uid(),'f1000000-0000-4000-8000-000000000001',5);
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
INSERT INTO ratings(application_id,rater_user_id,rated_user_id,stars) VALUES('f3000000-0000-4000-8000-000000000003',auth.uid(),'f1000000-0000-4000-8000-000000000002',4);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ DECLARE history jsonb; BEGIN
 history:=public.get_business_history('f1000000-0000-4000-8000-000000000001');
 IF jsonb_array_length(history)<>1 OR jsonb_array_length(history->0->'ratings')<>2 THEN RAISE EXCEPTION 'Verified public history or mutual ratings missing'; END IF;
 IF (history->0) ? 'messages' OR (history->0) ? 'delivery_url' THEN RAISE EXCEPTION 'Private information exposed by public history'; END IF;
 IF (history->0->>'delivery_hours')::numeric<>0 THEN RAISE EXCEPTION 'Server milestone timestamps are incorrect'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ DECLARE campaign uuid; first_page jsonb; second_page jsonb; BEGIN
 FOR i IN 1..54 LOOP
  INSERT INTO campaigns(brand_id,name,funded,status) VALUES('f3000000-0000-4000-8000-000000000001','Historical partnership '||i,true,'active') RETURNING id INTO campaign;
  INSERT INTO campaign_applications(campaign_id,influencer_user_id,status) VALUES(campaign,'f1000000-0000-4000-8000-000000000001','approved');
 END LOOP;
 first_page:=public.get_business_history('f1000000-0000-4000-8000-000000000001',0);
 second_page:=public.get_business_history('f1000000-0000-4000-8000-000000000001',50);
 IF jsonb_array_length(first_page)<>50 OR jsonb_array_length(second_page)<>5 THEN RAISE EXCEPTION 'Older partnerships are inaccessible'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page) a JOIN jsonb_array_elements(second_page) b ON a->>'id'=b->>'id') THEN RAISE EXCEPTION 'History pagination duplicates partnerships'; END IF;
END $$;
SELECT 'Business privacy, atomic chat, verified ratings and history pagination passed; synthetic rows will be rolled back' AS result;
ROLLBACK;
