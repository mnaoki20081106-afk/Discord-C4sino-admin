import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

type Channel = { id:string; name:string };

type VendingPanelRow = {
  id:string;
  name:string;
  channelId:string|null;
  messageId:string|null;
  productCount:number;
  productNames:string[];
  totalStock:number;
  hasInfiniteStock:boolean;
  totalSales:number;
};

type PanelRow = {
  key:string;
  machineId:string;
  name:string;
  channelIds:string[];
  messageUrl:string|null;
  productNames:string[];
  totalStock:number;
  hasUnlimitedStock:boolean;
  totalSales:number;
};

function channelLabel(channels:Channel[],id:string|null){
  if(!id) return null;
  const channel=channels.find(row=>row.id===id);
  return channel?"#"+channel.name:"#"+id;
}

export default function PanelOverview({
  guildId,
  channels,
  onError,
  onEditVending
}:{
  guildId:string;
  channels:Channel[];
  onError:(reason:unknown)=>void;
  onEditVending:(machineId:string)=>void;
}){
  const [busy,setBusy]=useState(false);
  const [vendingRows,setVendingRows]=useState<VendingPanelRow[]>([]);
  const [loadError,setLoadError]=useState("");

  async function load(){
    setBusy(true);
    setLoadError("");
    try{
      setVendingRows(await api<VendingPanelRow[]>(`/api/guilds/${guildId}/vending/panels`));
    }catch(reason){
      setLoadError(reason instanceof Error?reason.message:String(reason));
      onError(reason);
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{void load()},[guildId]);

  const rows=useMemo<PanelRow[]>(()=>{
    return vendingRows.map(row=>({
      key:"vending:"+row.id,
      machineId:row.id,
      name:row.name,
      channelIds:row.channelId?[row.channelId]:[],
      messageUrl:row.channelId&&row.messageId
        ?`https://discord.com/channels/${guildId}/${row.channelId}/${row.messageId}`
        :null,
      productNames:row.productNames,
      totalStock:row.totalStock,
      hasUnlimitedStock:row.hasInfiniteStock,
      totalSales:row.totalSales
    }));
  },[vendingRows,guildId]);

  const totals=useMemo(()=>({
    panels:rows.length,
    installed:rows.filter(row=>row.channelIds.length>0).length,
    stock:rows.reduce((sum,row)=>sum+row.totalStock,0),
    sales:rows.reduce((sum,row)=>sum+row.totalSales,0)
  }),[rows]);

  return (
    <section className="card panel-overview">
      <div className="section-head">
        <div>
          <span className="eyebrow">PANEL OVERVIEW</span>
          <h2>パネル管理</h2>
          <p>
            「自販機」タブで設置した自販機パネルを、商品・在庫・販売数ごとに一覧で確認できます。
            編集は自販機タブで行うため、ここから直接ジャンプできます。
          </p>
        </div>
        <button className="secondary" onClick={()=>void load()} disabled={busy}>
          再読み込み
        </button>
      </div>

      <div className="metric-grid">
        <article className="metric card">
          <span>自販機パネル</span>
          <strong>{totals.panels}</strong>
          <small>登録済みの自販機</small>
        </article>
        <article className="metric card">
          <span>Discordに設置済み</span>
          <strong>{totals.installed}</strong>
          <small>未設置を除く件数</small>
        </article>
        <article className="metric card">
          <span>合計在庫</span>
          <strong>{totals.stock}</strong>
          <small>無在庫販売の商品は含みません</small>
        </article>
        <article className="metric card">
          <span>累計販売数</span>
          <strong>{totals.sales}</strong>
          <small>全パネル合計</small>
        </article>
      </div>

      {loadError&&<div className="alert error">{loadError}</div>}

      <div className="panel-overview-list">
        {rows.length===0&&!busy&&(
          <p className="muted">
            まだ自販機パネルがありません。「自販機」タブで作成してください。
          </p>
        )}
        {rows.map(row=>(
          <article key={row.key} className="card panel-overview-row">
            <div className="panel-overview-row-head">
              <strong>{row.name}</strong>
              {row.channelIds.length===0&&(
                <span className="panel-overview-unlisted">未設置</span>
              )}
            </div>
            <div className="panel-overview-row-body">
              <span>
                設置先:{" "}
                {row.channelIds.length
                  ?row.channelIds.map(id=>channelLabel(channels,id)).join(", ")
                  :"—"}
              </span>
              <span>
                商品: {row.productNames.length?row.productNames.join(" / "):"未設定"}
              </span>
              <span>
                在庫: {row.totalStock}{row.hasUnlimitedStock?"（無在庫販売あり）":""} / 販売数: {row.totalSales}
              </span>
            </div>
            <div className="button-row">
              {row.messageUrl&&(
                <a className="secondary" href={row.messageUrl} target="_blank" rel="noreferrer">
                  Discordで開く
                </a>
              )}
              <button
                className="primary"
                onClick={()=>onEditVending(row.machineId)}
              >
                自販機タブで編集
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
