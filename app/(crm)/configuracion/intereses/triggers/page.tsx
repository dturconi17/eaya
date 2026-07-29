"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pregunta = { id:string; pregunta:string };
type Producto = { id:string; nombre:string };
type Trigger = { id:string; pregunta_id:string; producto_id:string; valor_disparador:number; preguntas_interes?:{pregunta:string}|null; productos?:{nombre:string}|null };

export default function ConfiguracionTriggersPage(){
  const [preguntas,setPreguntas]=useState<Pregunta[]>([]);
  const [productos,setProductos]=useState<Producto[]>([]);
  const [triggers,setTriggers]=useState<Trigger[]>([]);
  const [preguntaId,setPreguntaId]=useState("");
  const [productoId,setProductoId]=useState("");
  const [valor,setValor]=useState("1");
  const [loading,setLoading]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [mensaje,setMensaje]=useState("");
  const [tipo,setTipo]=useState<"success"|"error"|"">("");

  useEffect(()=>{cargar();},[]);

  async function cargar(){
    try{
      setLoading(true);
      const [pRes,prodRes,tRes]=await Promise.all([
        supabase.from("preguntas_interes").select("id,pregunta").eq("tipo_pregunta","trigger_producto").eq("activo",true).order("orden"),
        supabase.from("productos").select("id,nombre").eq("activo",true).order("nombre"),
        supabase.from("preguntas_producto_triggers").select("id,pregunta_id,producto_id,valor_disparador,preguntas_interes(pregunta),productos(nombre)").order("created_at",{ascending:false})
      ]);
      if(pRes.error) throw pRes.error;if(prodRes.error) throw prodRes.error;if(tRes.error) throw tRes.error;
      setPreguntas((pRes.data??[]) as Pregunta[]);setProductos((prodRes.data??[]) as Producto[]);setTriggers((tRes.data??[]) as unknown as Trigger[]);
    }catch(error:any){mostrar(error.message||"No se pudo cargar.","error");}finally{setLoading(false);}
  }
  function mostrar(texto:string,t:"success"|"error"){setMensaje(texto);setTipo(t);}
  async function guardar(){
    if(!preguntaId||!productoId) return mostrar("Seleccioná pregunta y producto.","error");
    try{setGuardando(true);const {error}=await supabase.from("preguntas_producto_triggers").insert({pregunta_id:preguntaId,producto_id:productoId,valor_disparador:Number(valor),activo:true});if(error)throw error;mostrar("Trigger creado.","success");setProductoId("");await cargar();}
    catch(error:any){mostrar(error.code==="23505"?"Ese trigger ya existe.":error.message||"No se pudo guardar.","error");}finally{setGuardando(false);}
  }
  async function eliminar(id:string){if(!confirm("¿Eliminar este trigger?"))return;const {error}=await supabase.from("preguntas_producto_triggers").delete().eq("id",id);if(error)return mostrar(error.message,"error");mostrar("Trigger eliminado.","success");await cargar();}
  function etiqueta(v:number){return v===1?"Sí / Positivo":v===-1?"No / Negativo":"Neutro";}

  return <main style={s.page}><div style={s.container}>
    <header style={s.header}><div style={s.breadcrumb}>Configuración / Intereses</div><h1 style={s.title}>Triggers de productos</h1><p style={s.subtitle}>Definí qué producto se sugiere para cada respuesta.</p></header>
    {mensaje&&<div style={tipo==="success"?s.success:s.error}>{tipo==="success"?<CheckCircle2 size={19}/>:<AlertCircle size={19}/>} {mensaje}</div>}

    <section style={s.card}><div style={s.cardHeader}><div style={s.icon}><Link2 size={22}/></div><div><h2 style={s.cardTitle}>Nueva regla</h2><p style={s.subtitle}>Una pregunta puede disparar uno o varios productos.</p></div></div>
      <div style={s.formGrid}>
        <label style={s.field}><span style={s.label}>Pregunta trigger</span><select style={s.input} value={preguntaId} onChange={e=>setPreguntaId(e.target.value)}><option value="">Seleccioná</option>{preguntas.map(p=><option key={p.id} value={p.id}>{p.pregunta}</option>)}</select></label>
        <label style={s.field}><span style={s.label}>Respuesta</span><select style={s.input} value={valor} onChange={e=>setValor(e.target.value)}><option value="1">Sí / Positivo</option><option value="-1">No / Negativo</option><option value="0">Neutro</option></select></label>
        <label style={s.field}><span style={s.label}>Producto</span><select style={s.input} value={productoId} onChange={e=>setProductoId(e.target.value)}><option value="">Seleccioná</option>{productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
        <button style={s.primary} disabled={guardando} onClick={guardar}><Plus size={18}/>{guardando?"Guardando...":"Agregar trigger"}</button>
      </div>
    </section>

    <section style={s.card}><div style={s.listHeader}><h2 style={s.cardTitle}>Reglas configuradas</h2><span style={s.counter}>{triggers.length} triggers</span></div>
      {loading?<div style={s.empty}>Cargando...</div>:triggers.length===0?<div style={s.empty}>Sin triggers.</div>:<div style={s.list}>{triggers.map(t=><article key={t.id} style={s.row}>
        <div style={s.flow}><div style={s.box}><small>Pregunta</small><strong>{t.preguntas_interes?.pregunta||t.pregunta_id}</strong></div><span>→</span><span style={s.badge}>{etiqueta(t.valor_disparador)}</span><span>→</span><div style={s.box}><small>Producto</small><strong>{t.productos?.nombre||t.producto_id}</strong></div></div>
        <button style={s.danger} onClick={()=>eliminar(t.id)}><Trash2 size={17}/>Eliminar</button>
      </article>)}</div>}
    </section>
  </div></main>;
}

const s:Record<string,React.CSSProperties>={page:{minHeight:"100vh",padding:24,background:"#f1f5f9"},container:{maxWidth:1150,margin:"0 auto"},header:{marginBottom:24},breadcrumb:{fontSize:13,color:"#64748b",marginBottom:8},title:{margin:0,fontSize:28,color:"#0f172a"},subtitle:{margin:"6px 0 0",color:"#64748b"},card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:22,marginBottom:18},cardHeader:{display:"flex",gap:12,alignItems:"center",paddingBottom:18,marginBottom:18,borderBottom:"1px solid #e2e8f0"},icon:{width:44,height:44,display:"grid",placeItems:"center",borderRadius:11,background:"#eff6ff",color:"#2563eb"},cardTitle:{margin:0,fontSize:18,color:"#0f172a"},formGrid:{display:"grid",gridTemplateColumns:"2fr 1fr 1.5fr auto",gap:14,alignItems:"end"},field:{display:"flex",flexDirection:"column",gap:7},label:{fontSize:14,fontWeight:600,color:"#334155"},input:{minHeight:43,padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:9,background:"#fff"},primary:{minHeight:43,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 15px",border:0,borderRadius:9,background:"#2563eb",color:"#fff",fontWeight:700,cursor:"pointer"},listHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},counter:{fontSize:14,color:"#64748b"},list:{display:"flex",flexDirection:"column",gap:12},row:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",padding:16,border:"1px solid #e2e8f0",borderRadius:11},flow:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"},box:{display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",borderRadius:9,background:"#f8fafc"},badge:{padding:"7px 10px",borderRadius:999,background:"#ede9fe",color:"#6d28d9",fontSize:13,fontWeight:700},danger:{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 12px",border:"1px solid #fecaca",borderRadius:8,background:"#fff",color:"#dc2626",cursor:"pointer"},success:{display:"flex",gap:9,alignItems:"center",padding:13,marginBottom:16,border:"1px solid #86efac",borderRadius:9,background:"#f0fdf4",color:"#166534"},error:{display:"flex",gap:9,alignItems:"center",padding:13,marginBottom:16,border:"1px solid #fecaca",borderRadius:9,background:"#fef2f2",color:"#b91c1c"},empty:{padding:35,textAlign:"center",color:"#64748b"}};
