import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({rows:[] as any[],rejectSend:false,onInsert:null as any,user:{id:"creator"}}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:state.user})}));
vi.mock("@/integrations/supabase/client",()=>{
  class Query {
    table:string; cutoff:string|null=null; orders:Array<{key:string;ascending:boolean}>=[]; max=Infinity; inserting=false;
    constructor(table:string){this.table=table;}
    select(){return this;} eq(){return this;} update(){return this;}
    order(key:string,{ascending}:any){this.orders.push({key,ascending});return this;} limit(max:number){this.max=max;return this;}
    or(filter:string){this.cutoff=filter.split(",")[0].replace("created_at.lt.","");return this;}
    insert(){this.inserting=true;return this;}
    then(resolve:any,reject:any){
      if(this.inserting)return Promise.resolve({data:null,error:state.rejectSend?{message:"network failure"}:null}).then(resolve,reject);
      let data=this.table==="messages"?[...state.rows]:[];
      if(this.cutoff)data=data.filter(r=>r.created_at<this.cutoff!);
      data.sort((a,b)=>{for(const o of this.orders){const comparison=String(a[o.key]).localeCompare(String(b[o.key]));if(comparison)return o.ascending?comparison:-comparison;}return 0;});
      return Promise.resolve({data:data.slice(0,this.max),error:null}).then(resolve,reject);
    }
  }
  return {supabase:{from:(table:string)=>new Query(table),channel:()=>({on(_event:any,_filter:any,callback:any){state.onInsert=callback;return this;},subscribe(){return this;}}),removeChannel:()=>{}}};
});
import { useMessages } from "@/hooks/useChat";
beforeEach(()=>{state.rejectSend=false;state.rows=Array.from({length:150},(_,i)=>({id:`m${String(i+1).padStart(3,"0")}`,conversation_id:"conversation",sender_id:"creator",content:`Message ${i+1}`,message_type:"text",media_url:null,read_at:null,created_at:new Date(Date.UTC(2026,9,14,0,0,i+1)).toISOString()}));});
describe("private chat history",()=>{
  it("shows the newest messages chronologically and loads older messages without losing recent history",async()=>{
    const {result}=renderHook(()=>useMessages("conversation"));
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.messages[0].content).toBe("Message 51");
    expect(result.current.messages[99].content).toBe("Message 150");
    expect(result.current.hasOlder).toBe(true);
    await act(()=>result.current.loadOlder());
    expect(result.current.messages).toHaveLength(150);
    expect(result.current.messages[0].content).toBe("Message 1");
    expect(result.current.messages[149].content).toBe("Message 150");
    expect(result.current.hasOlder).toBe(false);
  });
  it("does not duplicate messages when a realtime event is delivered twice",async()=>{
    const {result}=renderHook(()=>useMessages("conversation"));
    await waitFor(()=>expect(result.current.loading).toBe(false));
    act(()=>state.onInsert({new:state.rows[149]}));
    expect(result.current.messages).toHaveLength(100);
    const newMessage={...state.rows[149],id:"m151",content:"New message"};
    act(()=>{state.onInsert({new:newMessage});state.onInsert({new:newMessage});});
    expect(result.current.messages).toHaveLength(101);
  });
  it("reports a rejected send instead of pretending the message was delivered",async()=>{
    state.rejectSend=true;
    const {result}=renderHook(()=>useMessages("conversation"));
    await waitFor(()=>expect(result.current.loading).toBe(false));
    await expect(result.current.sendMessage("Important message")).rejects.toThrow(/enviar/);
    expect(result.current.messages).toHaveLength(100);
  });
});
