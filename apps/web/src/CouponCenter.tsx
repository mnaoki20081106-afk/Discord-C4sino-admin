import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import { Loading, VmDetail, VmMachine, yen } from "./console-ui";

type CouponRow = { machineId:string; machineName:string; code:string; discount:number; created_at:number };

function couponBase(guildId:string,machineId:string){
  return `/api/guilds/${guildId}/vending/${machineId}/coupons`;
}

/** Coupons of every vending machine on one screen. */
export default function CouponCenter({
  guildId, onNotice, onError
}:{
  guildId:string;
  onNotice:(message:string)=>void;
  onError:(reason:unknown)=>void;
}){
  const [machines,setMachines]=useState<VmMachine[]>([]);
  const [coupons,setCoupons]=useState<CouponRow[]>([]);
  const [busy,setBusy]=useState(false);
  // target = vending machine id
  const [form,setForm]=useState({target:"",code:"",discount:100});

  async function load(){
    setBusy(true);
    try{
      const list=await api<VmMachine[]>(`/api/guilds/${guildId}/vending`);
      const details=await Promise.all(list.map(machine=>api<VmDetail>(`/api/guilds/${guildId}/vending/${machine.id}`)));
      setMachines(list);
      setCoupons(details.flatMap(detail=>detail.coupons.map(coupon=>({...coupon,machineId:detail.id,machineName:detail.name}))));
      const targets=list.map(machine=>machine.id);
      setForm(current=>({...current,target:targets.includes(current.target)?current.target:targets[0]??""}));
    }catch(reason){ onError(reason); }
    finally{ setBusy(false); }
  }

  useEffect(()=>{ void load(); },[guildId]);

  async function create(event:FormEvent){
    event.preventDefault();
    const machineId=form.target;
    if(!machineId) return;
    setBusy(true);
    try{
      await api(couponBase(guildId,machineId),{
        method:"POST",
        body:JSON.stringify({code:form.code.trim(),discount:Number(form.discount)})
      });
      onNotice("クーポン「"+form.code.trim()+"」を作成しました");
      setForm(current=>({...current,code:""}));
      await load();
    }catch(reason){ onError(reason); }
    finally{ setBusy(false); }
  }

  async function remove(row:CouponRow){
    if(!window.confirm(`クーポン「${row.code}」を無効化しますか？`)) return;
    setBusy(true);
    try{
      await api(couponBase(guildId,row.machineId)+"/"+encodeURIComponent(row.code),{method:"DELETE"});
      onNotice("クーポンを無効化しました");
      await load();
    }catch(reason){ onError(reason); }
    finally{ setBusy(false); }
  }

  return (
    <>
      <div className="xc-page-head">
        <div>
          <h1>クーポン管理</h1>
          <p>自販機ごとの割引クーポンを作成・無効化します。</p>
        </div>
      </div>

      <section className="xc-card">
        <form className="xc-inline-form" onSubmit={event=>void create(event)} style={{marginBottom:18}}>
          <div className="row">
            <label>自販機
              <select value={form.target} onChange={event=>setForm({...form,target:event.target.value})} required>
                {machines.length===0&&<option value="">自販機がありません</option>}
                {machines.map(machine=><option key={machine.id} value={machine.id}>{machine.name}</option>)}
              </select>
            </label>
            <label>クーポンコード
              <input value={form.code} maxLength={50} required onChange={event=>setForm({...form,code:event.target.value})} placeholder="例: WELCOME100" />
            </label>
            <label style={{flex:"0 1 170px"}}>割引額（円）
              <input type="number" min={1} step={1} value={form.discount} required onChange={event=>setForm({...form,discount:Number(event.target.value)})} />
            </label>
            <button type="submit" className="xc-btn violet" disabled={busy||!form.target}>クーポンを作成</button>
          </div>
        </form>

        <div className="xc-table-wrap">
          <table className="xc-table">
            <thead><tr><th>コード</th><th>自販機</th><th>割引額</th><th>作成日時</th><th>操作</th></tr></thead>
            <tbody>
              {coupons.map(row=>(
                <tr key={row.machineId+":"+row.code}>
                  <td><code>{row.code}</code></td>
                  <td>{row.machineName}</td>
                  <td className="price">{yen(row.discount)} 引き</td>
                  <td className="muted">{new Date(row.created_at).toLocaleString("ja-JP")}</td>
                  <td className="actions"><button type="button" className="xc-btn tiny del" disabled={busy} onClick={()=>void remove(row)}>無効化</button></td>
                </tr>
              ))}
              {coupons.length===0&&<tr><td colSpan={5} className={busy?"":"xc-empty"}>{busy?<Loading label="クーポンを読み込み中…" />:"有効なクーポンはありません。"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
