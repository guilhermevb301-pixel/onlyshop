import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { reconcileFunding } from "../../../api/_lib/reconcile-funding";
import { deriveCampaignMoney } from "../../../api/_lib/money";
import { reconcileSplit } from "../../../api/_lib/reconcile-split";
import { getMarketplaceToken } from "../../../api/_lib/marketplace-token";

const cid = "0c461b5c-bdc9-4551-b837-fbe8e6b921ee";
const fid = "9a2e62df-db7c-4a8e-9c2e-b71f0e89b84f";
const aid = "b21c6e30-1d08-4d50-888a-9352d68457c6";
const paid = { id: 123, status: "approved", external_reference: `funding:${fid}`, currency_id: "BRL", transaction_amount: 25, transaction_amount_refunded: 0, metadata: { funding_id: fid } };
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
function res() {
  const result = { status: 200, body: undefined as any };
  return { result, response: { status(n: number) { result.status = n; return this; }, json(v: unknown) { result.body = v; return this; } } };
}
beforeEach(() => {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-token";
  process.env.MERCADOPAGO_ACCESS_TOKEN = "mp-token";
  process.env.MP_WEBHOOK_SECRET = "signature-secret";
  process.env.MP_APP_CLIENT_ID = "123";
  process.env.MP_APP_CLIENT_SECRET = "client-secret";
  delete process.env.MP_SPLIT_TEST_BRAND_ID;
  delete process.env.MP_PLATFORM_OAUTH_USER_ID;
  process.env.MP_SPLIT_LIVE = "false";
});
afterEach(() => vi.unstubAllGlobals());

describe("funding recovery", () => {
  it("uses the verified platform OAuth connection instead of a different application's static token", async () => {
    process.env.MP_PLATFORM_OAUTH_USER_ID="platform-owner";
    process.env.MP_PLATFORM_USER_ID="100";
    vi.stubGlobal("fetch",async()=>json([{access_token:"correct-app-token",mp_user_id:"100",refresh_token:"refresh",expires_at:"2099-01-01T00:00:00Z"}]));
    expect(await getMarketplaceToken()).toBe("correct-app-token");
  });
  it("renews and saves the rotated refresh token before using the replacement", async () => {
    process.env.MP_PLATFORM_OAUTH_USER_ID="platform-owner";
    process.env.MP_PLATFORM_USER_ID="100";
    let saved=false;
    vi.stubGlobal("fetch",async(url:string,init?:RequestInit)=>{
      if(url.endsWith("oauth/token"))return json({access_token:"renewed",refresh_token:"rotated",user_id:100,expires_in:86400});
      if(init?.method==="PATCH"){expect(JSON.parse(String(init.body))).toMatchObject({access_token:"renewed",refresh_token:"rotated"});saved=true;return new Response(null,{status:204});}
      return json([{access_token:"expiring",mp_user_id:"100",refresh_token:"old-refresh",expires_at:"2020-01-01T00:00:00Z"}]);
    });
    expect(await getMarketplaceToken()).toBe("renewed");
    expect(saved).toBe(true);
  });
  it("rejects a connected account that is not the platform owner", async () => {
    process.env.MP_PLATFORM_OAUTH_USER_ID="platform-owner";
    process.env.MP_PLATFORM_USER_ID="100";
    vi.stubGlobal("fetch",async()=>json([{access_token:"wrong",mp_user_id:"200",expires_at:"2099-01-01T00:00:00Z"}]));
    await expect(getMarketplaceToken()).rejects.toThrow(/reconectada/);
  });
  it.each(["ok", "already"])("recovers a verified approval atomically (%s)", async result => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("campaign_fundings?")) { expect(url).toContain("brand_user_id=eq.owner"); return json([{ id: fid, expected_amount: 25 }]); }
      if (url.includes("payments/search")) return json({ results: [paid] });
      if (url.includes("payments/123")) return json(paid);
      if (url.endsWith("rpc/confirm_campaign_funding")) { expect(JSON.parse(String(init?.body))).toEqual({ _funding_id: fid, _payment_id: "123", _paid_amount: 25 }); return json(result); }
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await reconcileFunding(cid, "owner")).toBe(true);
  });
  it.each([{ status: "pending" }, { transaction_amount: 24 }, { external_reference: "another" }, { currency_id: "USD" }, { transaction_amount_refunded: 25 }, { metadata: { funding_id: "another" } }])("does not credit an unverified payment %j", async invalid => {
    let writes = 0;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") writes++;
      if (url.includes("campaign_fundings?")) return json([{ id: fid, expected_amount: 25 }]);
      if (url.includes("payments/search")) return json({ results: [paid] });
      return json({ ...paid, ...invalid });
    });
    expect(await reconcileFunding(cid, "owner")).toBe(false);
    expect(writes).toBe(0);
  });
  it("rejects recovery by someone who does not own the campaign", async () => {
    vi.stubGlobal("fetch", async (url: string) => url.endsWith("auth/v1/user") ? json({id:"intruder"}) : json([{id:cid,funded:false,pay_mode:"escrow",brands:{user_id:"owner"}}]));
    const {default:handler}=await import("../../../api/fund-campaign");
    const {result,response}=res();
    await handler({method:"POST",headers:{authorization:"Bearer session"},body:{action:"reconcile",campaignId:cid}},response);
    expect(result.status).toBe(403);
  });
});

describe("signed webhook", () => {
  it("accepts a provider signed payment and confirms its funding", async () => {
    vi.stubGlobal("fetch", async (url:string, init?:RequestInit)=>{
      if(url.includes("payments/123"))return json(paid);
      expect(url).toContain("rpc/confirm_campaign_funding");
      expect(JSON.parse(String(init?.body))).toEqual({_funding_id:fid,_payment_id:"123",_paid_amount:25});
      return json("ok");
    });
    const {default:handler}=await import("../../../api/mp-webhook");
    const {result,response}=res();
    const sig=createHmac("sha256","signature-secret").update("id:123;request-id:request;ts:1234;").digest("hex");
    await handler({method:"POST",headers:{"x-signature":`ts=1234,v1=${sig}`,"x-request-id":"request"},query:{type:"payment","data.id":"123"},body:{}},response);
    expect(result).toEqual({status:200,body:{ok:true,funding:fid}});
  });
});

describe("split preparation", () => {
  it("creates the creator checkout with the seller token, fee and a stable retry key", async () => {
    const preferences: Array<{headers:any;body:any}> = [];
    vi.stubGlobal("fetch",async(url:string,init?:RequestInit)=>{
      if(url.endsWith("auth/v1/user"))return json({id:"brand-owner"});
      if(url.includes("campaign_applications?"))return json([{id:aid,campaign_id:cid,influencer_user_id:"creator",status:"accepted"}]);
      if(url.includes("campaigns?"))return json([{id:cid,name:"Campanha",brand_id:"brand",pay_mode:"split",reward_amount:10}]);
      if(url.includes("brands?"))return json([{user_id:"brand-owner"}]);
      if(url.includes("affiliate_mp_accounts?") && url.includes("select=mp_user_id"))return json([{mp_user_id:"200"}]);
      if(url.includes("affiliate_mp_accounts?"))return json([{access_token:"seller-token",refresh_token:null,expires_at:null}]);
      if(url.endsWith("users/me"))return json({id:100});
      if(url.endsWith("/split_payments"))return json([{id:fid}],201);
      if(url.includes("checkout/preferences")){preferences.push({headers:init?.headers,body:JSON.parse(String(init?.body))});return json({id:"pref",init_point:"https://mp.test/checkout"});}
      if(url.includes("split_payments?") && init?.method==="PATCH")return new Response(null,{status:204});
      throw new Error(`Unexpected request ${url}`);
    });
    const {default:handler}=await import("../../../api/pay-affiliate");
    const {result,response}=res();
    await handler({method:"POST",headers:{authorization:"Bearer session"},body:{applicationId:aid,gross:1,fee:0,net:999}},response);
    expect(result).toMatchObject({status:200,body:{gross:12,fee:2,net:10,init_point:"https://mp.test/checkout"}});
    expect(preferences).toHaveLength(1);
    expect(preferences[0]).toMatchObject({headers:{Authorization:"Bearer seller-token","X-Idempotency-Key":fid},body:{marketplace_fee:2,external_reference:`split:${fid}`,items:[{unit_price:12}],notification_url:`https://onlyshopbrasil.com.br/api/mp-webhook?split=${fid}&source_news=webhooks`}});
  });
  it.each(["test-brand", "another-brand"])("restricts split testing to the designated brand (%s)", async brandId => {
    process.env.MP_SPLIT_TEST_BRAND_ID="test-brand";
    vi.stubGlobal("fetch",async(url:string,init?:RequestInit)=>{
      if(url.endsWith("auth/v1/user"))return json({id:"owner"});
      if(url.includes("brands?"))return json([{id:brandId}]);
      if(url.endsWith("/campaigns"))return json([{id:cid,...JSON.parse(String(init?.body))}],201);
      throw new Error(`Unexpected ${url}`);
    });
    const {default:handler}=await import("../../../api/_lib/create-campaign");
    const {result,response}=res();
    await handler({method:"POST",headers:{authorization:"Bearer session"},body:{name:"Teste com creator",slots:1,reward_amount:10}},response);
    expect(result).toMatchObject({status:201,body:{pay_mode:brandId==="test-brand"?"split":"escrow",funded:brandId==="test-brand"}});
    delete process.env.MP_SPLIT_TEST_BRAND_ID;
  });
  it("confirms a split only with the seller token and matching recipient", async () => {
    let confirmed = false;
    vi.stubGlobal("fetch", async (url:string,init?:RequestInit)=>{
      if(url.includes("payments/"))expect(init?.headers).toEqual({Authorization:"Bearer seller-token"});
      if(url.includes("payments/search"))return json({results:[{id:321,status:"approved"}]});
      if(url.includes("payments/321"))return json({id:321,status:"approved",collector_id:200,currency_id:"BRL",transaction_amount:12,transaction_amount_refunded:0,external_reference:`split:${fid}`});
      expect(url).toContain("rpc/confirm_split_payment_atomic");
      expect(JSON.parse(String(init?.body))).toEqual({_split_id:fid,_payment_id:"321"});
      confirmed=true;return json({result:"ok"});
    });
    expect(await reconcileSplit({id:fid,gross:12},"seller-token","200")).toBe(true);
    expect(confirmed).toBe(true);
  });
  it("does not confirm a split credited to a different recipient", async () => {
    let writes=0;
    vi.stubGlobal("fetch",async(url:string,init?:RequestInit)=>{
      if(init?.method==="POST")writes++;
      if(url.includes("payments/search"))return json({results:[{id:321,status:"approved"}]});
      return json({id:321,status:"approved",collector_id:999,currency_id:"BRL",transaction_amount:12,transaction_amount_refunded:0,external_reference:`split:${fid}`});
    });
    expect(await reconcileSplit({id:fid,gross:12},"seller-token","200")).toBe(false);
    expect(writes).toBe(0);
  });
  it.each(["permuta", "process"])("keeps %s on its existing payment flow when split is enabled", kind => {
    expect(deriveCampaignMoney({name:"Campanha",slots:1,reward_amount:10,reward_type:kind==="permuta"?"permuta":"per_video",campaign_kind:kind==="process"?"process":"standard"},true)).toMatchObject({payMode:"escrow",funded:false});
  });
  it("refuses to use the marketplace's own account as the creator's seller account", async () => {
    vi.stubGlobal("fetch",async(url:string)=>{
      if(url.endsWith("auth/v1/user"))return json({id:"brand-owner"});
      if(url.includes("campaign_applications?"))return json([{id:aid,campaign_id:cid,influencer_user_id:"creator",status:"accepted"}]);
      if(url.includes("campaigns?"))return json([{id:cid,brand_id:"brand",pay_mode:"split",reward_amount:10}]);
      if(url.includes("brands?"))return json([{user_id:"brand-owner"}]);
      if(url.includes("affiliate_mp_accounts?") && url.includes("select=mp_user_id"))return json([{mp_user_id:"100"}]);
      if(url.includes("affiliate_mp_accounts?"))return json([{access_token:"seller-token",refresh_token:null,expires_at:null}]);
      if(url.endsWith("users/me"))return json({id:100});
      throw new Error("Unexpected money mutation");
    });
    const {default:handler}=await import("../../../api/pay-affiliate");
    const {result,response}=res();
    await handler({method:"POST",headers:{authorization:"Bearer session"},body:{applicationId:aid}},response);
    expect(result).toMatchObject({status:409,body:{needsAffiliateMp:true}});
  });
});
