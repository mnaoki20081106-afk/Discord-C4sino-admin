import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';

// The Security Gateway Durable Object can be unavailable (for example once the
// Durable Objects free-tier duration limit is used up). Maintenance leases live
// in D1, so dashboard edits and tickets must keep working.
const bundle=await build({stdin:{contents:`
import {openSecurityMaintenanceLease} from './src/security-bridge';
export default {async fetch(req,env){
  const gatewayDown={idFromName:()=>'id',get:()=>({fetch:async()=>{throw new Error('Exceeded allowed duration in Durable Objects free tier.');}})};
  const lease=await openSecurityMaintenanceLease({...env,SECURITY_GATEWAY:gatewayDown},'123456789012345678','dashboard_edit',30);
  const row=await env.DB.prepare('SELECT guild_id,scope FROM maintenance_leases').first();
  return Response.json({lease,row});
}};`,resolveDir:process.cwd(),sourcefile:'outage-entry.ts'},bundle:true,write:false,format:'esm',platform:'browser'});
const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],
  bindings:{DISCORD_BOT_TOKEN:'t',DISCORD_APPLICATION_ID:'223456789012345678',SESSION_ENCRYPTION_KEY:'k'},
  outboundService:()=>Response.json({},{status:404})});
after(()=>mf.dispose());

test('maintenance lease is created while the Security Gateway Durable Object is unavailable',async()=>{
  const response=await mf.dispatchFetch('https://worker.example/');
  const body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));
  assert.match(body.lease?.id??'',/^[0-9a-f-]{36}$/);
  assert.deepEqual(body.row,{guild_id:'123456789012345678',scope:'dashboard_edit'});
});
