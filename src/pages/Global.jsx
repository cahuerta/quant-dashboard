import { useEffect, useState, useCallback, useTransition } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

import "../styles/global.css";

const API = import.meta.env.VITE_API_URL;

export default function Global() {

  const [market,setMarket] = useState(null)
  const [perf,setPerf] = useState(null)
  const [equity,setEquity] = useState([])

  const [marketError,setMarketError] = useState(null)
  const [perfError,setPerfError] = useState(null)

  const [loading,setLoading] = useState(true)

  const [isPending,startTransition] = useTransition()


  const loadData = useCallback(async()=>{

    setLoading(true)

    try{

      const [marketRes,perfRes,equityRes] = await Promise.allSettled([

        fetch(`${API}/dashboard/market-context`,{cache:"no-store"}),

        fetch(`${API}/dashboard/performance`,{cache:"no-store"}),

        fetch(`${API}/dashboard/equity-curve`,{cache:"no-store"})

      ])


      if(marketRes.status==="fulfilled" && marketRes.value.ok){

        setMarket(await marketRes.value.json())

      }else{

        setMarketError("Error mercado")

      }


      if(perfRes.status==="fulfilled" && perfRes.value.ok){

        setPerf(await perfRes.value.json())

      }else{

        setPerfError("Error performance")

      }


      if(equityRes.status==="fulfilled" && equityRes.value.ok){

        const data = await equityRes.value.json()

        setEquity(data?.curve || [])

      }

    }catch(e){

      console.error("Dashboard error",e)

    }finally{

      setLoading(false)

    }

  },[])


  useEffect(()=>{

    loadData()

  },[loadData])


  const handleRefresh = ()=>{

    startTransition(()=>loadData())

  }


  if(loading){

    return <LoadingSkeleton/>

  }


  const equityNow = perf?.equity ?? 0

  const totalReturn = Number(perf?.total_return_pct ?? 0)

  const drawdown = Number(perf?.drawdown_pct ?? 0)

  const winRate = Number(perf?.win_rate_pct ?? 0)


  return(

<div className="global-container">


<header className="global-header">

<h1>Resumen Global del Sistema</h1>

<div className="status-indicator">

● {isPending ? "Sincronizando..." : "En línea"}

</div>

</header>


{/* ================= KPIs PRINCIPALES ================= */}

<SectionTitle title="KPIs Principales"/>

<div className="dashboard-grid">

<StatCard
label="CAPITAL TOTAL"
value={`$${Math.round(equityNow).toLocaleString()}`}
big
/>

<StatCard
label="RETORNO TOTAL"
value={`${totalReturn.toFixed(2)}%`}
color={totalReturn>=0 ? "#22c55e" : "#ef4444"}
big
/>

</div>



{/* ================= EQUITY CURVE ================= */}

{equity.length>0 && (

<>

<SectionTitle title="Equity Curve"/>

<div className="chart-container">

<ResponsiveContainer width="100%" height={280}>

<LineChart data={equity}>

<CartesianGrid strokeDasharray="3 3" stroke="#334155"/>

<XAxis dataKey="date" stroke="#94a3b8"/>

<YAxis stroke="#94a3b8"/>

<Tooltip/>

<Line
type="monotone"
dataKey="equity"
stroke="#38bdf8"
strokeWidth={3}
dot={false}
/>

</LineChart>

</ResponsiveContainer>

</div>

</>

)}



{/* ================= ESTADO DEL SISTEMA ================= */}

<SectionTitle title="Estado del Sistema"/>

<div className="dashboard-grid">

<StatCard
label="MODO MERCADO"
value={market?.market_mode?.toUpperCase() || "—"}
/>

<StatCard
label="CONFIANZA RÉGIMEN"
value={
market?.confidence!=null
?`${Math.round(market.confidence*100)}%`
:"—"
}
/>

<StatCard
label="HIGH WATER MARK"
value={
perf?.high_water_mark
?`$${Math.round(perf.high_water_mark).toLocaleString()}`
:"—"
}
/>

<StatCard
label="ACTIVO DESDE"
value={perf?.since || "—"}
/>

</div>



{/* ================= RIESGO ================= */}

<SectionTitle title="Riesgo del Sistema"/>

<div className="dashboard-grid">

<StatCard
label="DRAWDOWN ACTUAL"
value={`${drawdown.toFixed(2)}%`}
color="#f97316"
/>

<StatCard
label="MAX DRAWDOWN"
value={`${Number(perf?.max_drawdown_pct ?? 0).toFixed(2)}%`}
/>

<StatCard
label="RATIO SHARPE"
value={Number(perf?.sharpe_ratio ?? 0).toFixed(2)}
/>

</div>



{/* ================= CALIDAD MODELO ================= */}

<SectionTitle title="Calidad del Modelo"/>

<div className="dashboard-grid">

<div className="stat-card">

<span className="stat-label">WIN RATE</span>

<div className="stat-value">

{winRate.toFixed(1)}%

</div>

<div className="progress-bar">

<div
className="progress-fill"
style={{width:`${winRate}%`}}
/>

</div>

</div>


<StatCard
label="ERROR PREDICCIÓN"
value={`${Number(perf?.avg_prediction_error_pct ?? 0).toFixed(1)}%`}
/>

<StatCard
label="PREDICCIONES"
value={perf?.evaluated_predictions ?? 0}
/>

<StatCard
label="PENDIENTES"
value={perf?.pending_predictions ?? 0}
/>

</div>



<div className="dashboard-actions">

<button
onClick={handleRefresh}
className="refresh-btn"
disabled={isPending}
>

{isPending ? "Sincronizando..." : "Actualizar"}

</button>

</div>


</div>

  )

}



function SectionTitle({title}){

return(

<h2 className="section-title">

{title}

</h2>

)

}



function StatCard({label,value,color="#ffffff",big=false}){

return(

<div className={`stat-card ${big ? "stat-big":""}`}>

<span className="stat-label">

{label}

</span>

<div
className="stat-value"
style={{color}}
>

{value}

</div>

</div>

)

}



function LoadingSkeleton(){

return(

<div className="global-container">

<div className="global-loader">

Sincronizando sistema...

</div>

</div>

)

}
