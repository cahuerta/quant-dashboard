import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

const API = import.meta.env.VITE_API_URL;

/* -------------------------------------------------------
HOOK DE DATA
------------------------------------------------------- */

const useAnalysisData = (ticker, apiUrl) => {

  const [data,setData] = useState({
    meta:null,
    prediction:null,
    historical:null,
    alpha:null,
    full_latest:null
  })

  const [loading,setLoading] = useState(false)
  const [error,setError] = useState(null)

  useEffect(()=>{

    if(!ticker){
      setData({meta:null,prediction:null,historical:null,alpha:null,full_latest:null})
      return
    }

    const load = async()=>{

      setLoading(true)
      setError(null)

      try{

        const [resLatest,resAlpha] = await Promise.all([
          fetch(`${apiUrl}/dashboard/latest/${ticker}`),
          fetch(`${apiUrl}/alpha`)
        ])

        if(!resLatest.ok) throw new Error("Latest endpoint error")
        if(!resAlpha.ok) throw new Error("Alpha endpoint error")

        const [jsonLatest,jsonAlpha] = await Promise.all([
          resLatest.json(),
          resAlpha.json()
        ])

        const last = jsonLatest?.latest

        setData({
          meta:last?.meta || null,
          prediction:last?.prediction || null,
          historical:last?.historical || null,
          alpha:jsonAlpha?.results?.[ticker] || null,
          full_latest:last || null
        })

      }catch(err){
        setError(err.message)
      }

      setLoading(false)

    }

    load()

  },[ticker,apiUrl])

  return {data,loading,error}

}

/* -------------------------------------------------------
MAIN COMPONENT
------------------------------------------------------- */

export default function Analysis(){

  const [searchParams,setSearchParams] = useSearchParams()
  const queryTicker = searchParams.get("ticker")

  const [ticker,setTicker] = useState(queryTicker || "")
  const [tickers,setTickers] = useState([])

  const {data,loading,error} = useAnalysisData(ticker,API)

  useEffect(()=>{

    fetch(`${API}/dashboard/tickers`)
      .then(r=>r.json())
      .then(j=>setTickers(j?.tickers || []))

  },[])

  useEffect(()=>{
    if(ticker) setSearchParams({ticker},{replace:true})
  },[ticker,setSearchParams])

/* -------------------------------------------------------
BACKTEST DATA
------------------------------------------------------- */

  const chartDataHistorical = useMemo(()=>{

    if(!data.historical?.windows) return []

    return data.historical.windows.map((w,i)=>({
      name:`W${i+1}`,
      real:Number((w.ret_real*100).toFixed(2)),
      pred:Number((w.ret_pred*100).toFixed(2))
    }))

  },[data.historical])

/* -------------------------------------------------------
MODEL DIAGNOSTICS
------------------------------------------------------- */

  const chartDataModels = useMemo(()=>{

    const models = data.full_latest?.models_diagnostics
    if(!models) return []

    return Object.entries(models).map(([model,v])=>({

      model,
      error:v.error_pct ? Number(v.error_pct.toFixed(2)) : null,
      pred:v.pred_return ? Number(v.pred_return.toFixed(2)) : null,
      real:v.real_return ? Number(v.real_return.toFixed(2)) : null

    }))

  },[data.full_latest])

/* -------------------------------------------------------
FORECAST CONE
------------------------------------------------------- */

  const chartDataFuture = useMemo(()=>{

    if(!data.prediction || !data.full_latest) return []

    const priceNow = data.prediction.price_now
    const curve = data.full_latest.price_curve
    const hitRate = data.historical?.hit_rate_mean ?? 0.5

    const rows=[{
      label:"Hoy",
      price:priceNow,
      u50:priceNow,l50:priceNow,
      u70:priceNow,l70:priceNow,
      u90:priceNow,l90:priceNow
    }]

    curve?.price_path?.forEach((p,i)=>{

      const day=i+1
      const baseVol=p*(1-hitRate)*0.04*Math.min(day/10,1)

      rows.push({
        label:`T+${day}`,
        price:p,
        u50:p+baseVol*0.6,
        l50:p-baseVol*0.6,
        u70:p+baseVol,
        l70:p-baseVol,
        u90:p+baseVol*1.6,
        l90:p-baseVol*1.6
      })

    })

    return rows

  },[data.prediction,data.full_latest,data.historical])

/* ------------------------------------------------------- */

  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL")

  const handleTickerChange = useCallback(e=>{
    setTicker(e.target.value)
  },[])

/* ------------------------------------------------------- */

if(error){
return(
<div style={{padding:40,color:"white"}}>
Error: {error}
</div>
)
}

/* ------------------------------------------------------- */

return(

<div style={{padding:20,background:"#0f172a",minHeight:"100vh",color:"white"}}>

{/* HEADER */}

<div style={{display:"flex",justifyContent:"space-between",marginBottom:25}}>

<div>

<h1>Terminal de Análisis: {ticker || "---"}</h1>

<p style={{color:"#94a3b8"}}>
{isChile ? "Mercado Chileno 🇨🇱" : "Mercado Internacional 🌎"} | v3.3
</p>

</div>

<select value={ticker} onChange={handleTickerChange}>

<option value="">Seleccionar activo</option>

{tickers.map(t=>(
<option key={t} value={t}>{t}</option>
))}

</select>

</div>

{/* LOADING */}

{loading && <div style={{color:"#fbbf24"}}>Cargando análisis...</div>}

{/* CONTENT */}

{data.prediction && !loading && (

<div style={{display:"grid",gap:20}}>

{/* KPI ROW */}

<div style={{display:"grid",gridTemplateColumns:"1fr 0.7fr 0.8fr",gap:20}}>

<BloqueResumen prediction={data.prediction} isChile={isChile}/>
<BloqueAlphaScore alphaData={data.alpha}/>
<BloqueRobustez historical={data.historical}/>

</div>

{/* CHART ROW */}

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

<ChartBacktest data={chartDataHistorical}/>
<ChartModelDiagnostics data={chartDataModels}/>

</div>

{/* FORECAST */}

<ChartForecastCone
data={chartDataFuture}
prediction={data.prediction}
isChile={isChile}
/>

</div>

)}

</div>

)

}

/* -------------------------------------------------------
CHARTS
------------------------------------------------------- */

const ChartBacktest = ({data})=>(

<div style={{background:"#1e293b",padding:20,borderRadius:12}}>

<h3>Backtest Real vs Predicho</h3>

<ResponsiveContainer width="100%" height={300}>

<LineChart data={data}>

<CartesianGrid stroke="#334155"/>

<XAxis dataKey="name"/>

<YAxis unit="%"/>

<Tooltip/>

<Legend/>

<ReferenceLine y={0} stroke="#64748b"/>

<Line dataKey="real" stroke="#38bdf8" strokeWidth={3}/>

<Line dataKey="pred" stroke="#fbbf24" strokeWidth={3} strokeDasharray="5 5"/>

</LineChart>

</ResponsiveContainer>

</div>

)

/* ------------------------------------------------------- */

const ChartModelDiagnostics = ({data})=>(

<div style={{background:"#1e293b",padding:20,borderRadius:12}}>

<h3>Model Diagnostics (H1-H10)</h3>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={data}>

<CartesianGrid stroke="#334155"/>

<XAxis dataKey="model"/>

<YAxis unit="%"/>

<Tooltip/>

<Legend/>

<Bar dataKey="error" fill="#ef4444"/>

</BarChart>

</ResponsiveContainer>

</div>

)

/* ------------------------------------------------------- */

const ChartForecastCone = ({data,prediction,isChile})=>(

<div style={{background:"#1e293b",padding:20,borderRadius:12}}>

<h3 style={{color:"#fbbf24"}}>Forecast Cone</h3>

<ResponsiveContainer width="100%" height={350}>

<AreaChart data={data}>

<CartesianGrid stroke="#334155"/>

<XAxis dataKey="label"/>

<YAxis
tickFormatter={v=>isChile ? `$${Math.round(v)}` : `$${v.toFixed(2)}`}
/>

<Tooltip/>

<Area dataKey="u90" stroke="none" fill="#fbbf24" fillOpacity={0.05} baseLine={d=>d.l90}/>

<Area dataKey="u70" stroke="none" fill="#fbbf24" fillOpacity={0.1} baseLine={d=>d.l70}/>

<Area dataKey="u50" stroke="none" fill="#fbbf24" fillOpacity={0.2} baseLine={d=>d.l50}/>

<Line dataKey="price" stroke="#fbbf24" strokeWidth={3}/>

<ReferenceLine y={prediction.price_now} stroke="#64748b"/>

</AreaChart>

</ResponsiveContainer>

</div>

)

/* -------------------------------------------------------
KPI
------------------------------------------------------- */

function BloqueResumen({prediction,isChile}){

const color =
prediction.recommendation==="COMPRA" ? "#22c55e" :
prediction.recommendation==="VENTA" ? "#ef4444" :
"#eab308"

return(

<div style={{padding:20,background:"#1e293b",borderRadius:12,borderLeft:`6px solid ${color}`}}>

<div style={{color:"#94a3b8"}}>RECOMENDACIÓN</div>

<h2 style={{color}}>{prediction.recommendation}</h2>

<div>

Target {formatPct(prediction.ret_ens_pct)}

</div>

<div>

Precio Obj {formatMoney(prediction.price_pred,isChile)}

</div>

</div>

)

}

function BloqueAlphaScore({alphaData}){

const score = alphaData?.alpha_score ?? 0

return(

<div style={{padding:20,background:"#1e293b",borderRadius:12,textAlign:"center"}}>

<div>ALPHA SCORE</div>

<div style={{fontSize:32}}>{score.toFixed(3)}</div>

</div>

)

}

function BloqueRobustez({historical}){

const hit = (historical?.hit_rate_mean ?? 0)*100

return(

<div style={{padding:20,background:"#1e293b",borderRadius:12}}>

<div>HIT RATE</div>

<div style={{fontSize:28}}>{hit.toFixed(1)}%</div>

</div>

)

}

/* ------------------------------------------------------- */

function formatMoney(v,isChile){

if(v==null) return "—"

return isChile
? "$"+Math.round(v).toLocaleString("es-CL")
: "$"+Number(v).toFixed(2)

}

function formatPct(v){

if(v==null) return "—"

return (v>0?"+":"")+Number(v).toFixed(2)+"%"

}
