"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardList, PackageCheck, Save, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pregunta = { id:string; pregunta:string; descripcion:string|null; categoria:string|null; tipo_pregunta:"perfil"|"trigger_producto"; orden:number };
type Respuesta = { valor:-1|0|1|null; observacion:string };
type Cliente = { id:string; nombre:string; apellido:string; numero_documento:string };
type Sugerencia = { id:string; producto_id:string; estado_gestion:string; observacion_gestion:string|null; productos?:{nombre:string}|null };

const opciones=[
  {valor:-1 as const,etiqueta:"No",fondo:"#fef2f2",color:"#b91c1c"},
  {valor:0 as const,etiqueta:"Neutro",fondo:"#f1f5f9",color:"#475569"},
  {valor:1 as const,etiqueta:"Sí",fondo:"#f0fdf4",color:"#166534"},
];

export default function RelevamientoClientePage(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const clienteId=params.id;
  const [cliente,setCliente]=useState<Cliente|null>(null);
  const [preguntas,setPreguntas]=useState<Pregunta[]>([]);
  const [respuestas,setRespuestas]=useState<Record<string,Respuesta>>({});
  const [sugerencias,setSugerencias]=useState<Sugerencia[]>([]);
  const [loading,setLoading]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [mensaje,setMensaje]=useState("");
  const [tipo,setTipo]=useState<"success"|"error"|"">("");

  useEffect(()=>{if(clienteId)cargar();},[clienteId]);

  const agrupadas=useMemo(()=>preguntas.reduce<Record<string,Pregunta[]>>((acc,p)=>{
    const categoria=p.categoria||"General";acc[categoria]=acc[categoria]||[];acc[categoria].push(p);return acc;
  },{}),[preguntas]);

  function mostrar(texto:string,t:"success"|"error"){setMensaje(texto);setTipo(t);}

  async function cargar(){
    try{
      setLoading(true);
      const [cRes,pRes,rRes,sRes]=await Promise.all([
        supabase.from("clientes").select("id,nombre,apellido,numero_documento").eq("id",clienteId).single(),
        supabase.from("preguntas_interes").select("id,pregunta,descripcion,categoria,tipo_pregunta,orden").eq("activo",true).order("orden"),
        supabase.from("clientes_respuestas").select("pregunta_id,valor,observacion").eq("cliente_id",clienteId).eq("vigente",true),
        supabase.from("clientes_productos_sugeridos").select("id,producto_id,estado_gestion,observacion_gestion,productos(nombre)").eq("cliente_id",clienteId).order("created_at",{ascending:false})
      ]);
      if(cRes.error)throw cRes.error;if(pRes.error)throw pRes.error;if(rRes.error)throw rRes.error;if(sRes.error)throw sRes.error;
      setCliente(cRes.data as Cliente);setPreguntas((pRes.data??[]) as Pregunta[]);setSugerencias((sRes.data??[]) as unknown as Sugerencia[]);
      const mapa:Record<string,Respuesta>={};for(const p of pRes.data??[])mapa[p.id]={valor:null,observacion:""};
      for(const r of rRes.data??[])mapa[r.pregunta_id]={valor:r.valor as -1|0|1,observacion:r.observacion??""};
      setRespuestas(mapa);
    }catch(error:any){mostrar(error.message||"No se pudo cargar el relevamiento.","error");}finally{setLoading(false);}
  }

  function cambiar(preguntaId:string,cambios:Partial<Respuesta>){setRespuestas(prev=>({...prev,[preguntaId]:{...(prev[preguntaId]??{valor:null,observacion:""}),...cambios}}));}

  async function guardar(){
    const respondidas=preguntas.filter(p=>respuestas[p.id]?.valor!==null);
    if(respondidas.length===0)return mostrar("Respondé al menos una pregunta.","error");

    try{
      setGuardando(true);
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Usuario no autenticado.");
      const {data:relevamiento,error:rError}=await supabase.from("relevamientos").insert({cliente_id:clienteId,canal:"stand",vendedor_id:user.id}).select("id").single();
      if(rError)throw rError;

      for(const pregunta of respondidas){
        const respuesta=respuestas[pregunta.id];
        const {error:cierreError}=await supabase.from("clientes_respuestas").update({vigente:false}).eq("cliente_id",clienteId).eq("pregunta_id",pregunta.id).eq("vigente",true);
        if(cierreError)throw cierreError;

        const {data:respuestaCreada,error:respuestaError}=await supabase.from("clientes_respuestas").insert({cliente_id:clienteId,pregunta_id:pregunta.id,valor:respuesta.valor,observacion:respuesta.observacion.trim()||null,vigente:true,relevamiento_id:relevamiento.id,respondido_por:user.id}).select("id").single();
        if(respuestaError)throw respuestaError;

        if(pregunta.tipo_pregunta==="trigger_producto"){
          const {data:triggers,error:tError}=await supabase.from("preguntas_producto_triggers").select("producto_id").eq("pregunta_id",pregunta.id).eq("valor_disparador",respuesta.valor).eq("activo",true);
          if(tError)throw tError;

          for(const trigger of triggers??[]){
            const {data:existente}=await supabase.from("clientes_productos_sugeridos").select("id").eq("relevamiento_id",relevamiento.id).eq("producto_id",trigger.producto_id).maybeSingle();
            let sugerenciaId=existente?.id;
            if(!sugerenciaId){
              const {data:sugerencia,error:sError}=await supabase.from("clientes_productos_sugeridos").insert({cliente_id:clienteId,producto_id:trigger.producto_id,relevamiento_id:relevamiento.id,pregunta_id:pregunta.id,respuesta_id:respuestaCreada.id,estado_gestion:"pendiente"}).select("id").single();
              if(sError)throw sError;sugerenciaId=sugerencia.id;
            }
            const {error:mError}=await supabase.from("clientes_productos_sugeridos_motivos").upsert({sugerencia_id:sugerenciaId,pregunta_id:pregunta.id,respuesta_id:respuestaCreada.id},{onConflict:"sugerencia_id,pregunta_id,respuesta_id"});
            if(mError)throw mError;
          }
        }
      }
      mostrar("Relevamiento guardado y sugerencias actualizadas.","success");await cargar();
    }catch(error:any){mostrar(error.message||"No se pudo guardar.","error");}finally{setGuardando(false);}
  }

  async function gestionar(sugerencia:Sugerencia,estado:"no_ofrecido"|"ofrecido_sin_interes"|"ofrecido_interesado"){
    const {data:{user}}=await supabase.auth.getUser();if(!user)return mostrar("Usuario no autenticado.","error");
    const {error}=await supabase.from("clientes_productos_sugeridos").update({estado_gestion:estado,gestionado_por:user.id,gestionado_at:new Date().toISOString()}).eq("id",sugerencia.id);
    if(error)return mostrar(error.message,"error");

    if(estado==="ofrecido_interesado"){
      const {data:leadProducto,error:pError}=await supabase.from("lead_productos").insert({cliente_id:clienteId,producto_id:sugerencia.producto_id,estado:"iniciado",created_by:user.id}).select("id").single();
      if(pError){mostrar(`La gestión se guardó, pero no se inició el producto: ${pError.message}`,"error");await cargar();return;}
      router.push(`/clientes/${clienteId}/productos/${leadProducto.id}`);return;
    }
    mostrar("Resultado de gestión actualizado.","success");await cargar();
  }

  if(loading)return <main style={s.page}><div style={s.loading}>Cargando relevamiento...</div></main>;

  return <main style={s.page}><div style={s.container}>
    <header style={s.header}><div><div style={s.breadcrumb}>Clientes / Relevamiento</div><h1 style={s.title}>Intereses del cliente</h1><p style={s.subtitle}>Guardá información de perfil y detectá oportunidades comerciales.</p></div>
      {cliente&&<div style={s.client}><UserRound size={20}/><div><strong>{cliente.nombre} {cliente.apellido}</strong><span>Documento {cliente.numero_documento}</span></div></div>}
    </header>

    {mensaje&&<div style={tipo==="success"?s.success:s.error}>{tipo==="success"?<CheckCircle2 size={19}/>:<AlertCircle size={19}/>} {mensaje}</div>}

    <section style={s.card}><div style={s.cardHeader}><div style={s.icon}><ClipboardList size={22}/></div><div><h2 style={s.cardTitle}>Preguntas del relevamiento</h2><p style={s.subtitle}>Las respuestas anteriores aparecen seleccionadas y pueden modificarse.</p></div></div>
      <div style={s.categories}>{Object.entries(agrupadas).map(([categoria,items])=><div key={categoria} style={s.category}><h3 style={s.categoryTitle}>{categoria}</h3><div style={s.questions}>{items.map(p=>{
        const r=respuestas[p.id]??{valor:null,observacion:""};return <article key={p.id} style={s.questionCard}>
          <div style={s.questionHeader}><div><strong>{p.pregunta}</strong>{p.descripcion&&<p style={s.description}>{p.descripcion}</p>}</div><span style={p.tipo_pregunta==="trigger_producto"?s.trigger:s.profile}>{p.tipo_pregunta==="trigger_producto"?"Puede generar oferta":"Dato de perfil"}</span></div>
          <div style={s.options}>{opciones.map(o=>{const seleccionada=r.valor===o.valor;return <button key={o.valor} type="button" onClick={()=>cambiar(p.id,{valor:o.valor})} style={{...s.option,background:seleccionada?o.fondo:"#fff",color:seleccionada?o.color:"#475569",borderColor:seleccionada?o.color:"#cbd5e1"}}>{o.etiqueta}</button>;})}</div>
          <textarea style={s.observation} value={r.observacion} onChange={e=>cambiar(p.id,{observacion:e.target.value})} placeholder="Observación opcional"/>
        </article>})}</div></div>)}</div>
      <div style={s.footer}><button style={s.primary} onClick={guardar} disabled={guardando}><Save size={18}/>{guardando?"Guardando...":"Guardar relevamiento"}</button></div>
    </section>

    <section style={s.card}><div style={s.cardHeader}><div style={s.productIcon}><PackageCheck size={22}/></div><div><h2 style={s.cardTitle}>Productos sugeridos</h2><p style={s.subtitle}>Registrá el resultado comercial de cada oportunidad.</p></div></div>
      {sugerencias.length===0?<div style={s.empty}>Todavía no hay productos sugeridos.</div>:<div style={s.suggestionList}>{sugerencias.map(x=><article key={x.id} style={s.suggestionCard}><div><span style={s.status}>{x.estado_gestion.replaceAll("_"," ")}</span><h3 style={s.productName}>{x.productos?.nombre||"Producto"}</h3></div><div style={s.management}>
        <button style={s.secondary} onClick={()=>gestionar(x,"no_ofrecido")}>No lo ofrecí</button>
        <button style={s.reject} onClick={()=>gestionar(x,"ofrecido_sin_interes")}>Lo ofrecí y no le interesó</button>
        <button style={s.accept} onClick={()=>gestionar(x,"ofrecido_interesado")}>Lo ofrecí y lo quiere</button>
      </div></article>)}</div>}
    </section>
  </div></main>;
}

const s:Record<string,React.CSSProperties>={page:{minHeight:"100vh",padding:24,background:"#f1f5f9"},container:{maxWidth:1150,margin:"0 auto"},loading:{maxWidth:1150,margin:"0 auto",padding:30,color:"#64748b"},header:{display:"flex",justifyContent:"space-between",gap:18,flexWrap:"wrap",marginBottom:24},breadcrumb:{fontSize:13,color:"#64748b",marginBottom:8},title:{margin:0,fontSize:28,color:"#0f172a"},subtitle:{margin:"6px 0 0",color:"#64748b"},client:{display:"flex",gap:10,alignItems:"center",padding:"12px 15px",border:"1px solid #dbeafe",borderRadius:11,background:"#eff6ff",color:"#1e3a8a"},card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:22,marginBottom:18},cardHeader:{display:"flex",gap:12,alignItems:"center",paddingBottom:18,marginBottom:18,borderBottom:"1px solid #e2e8f0"},icon:{width:44,height:44,display:"grid",placeItems:"center",borderRadius:11,background:"#eff6ff",color:"#2563eb"},productIcon:{width:44,height:44,display:"grid",placeItems:"center",borderRadius:11,background:"#f0fdf4",color:"#16a34a"},cardTitle:{margin:0,fontSize:18,color:"#0f172a"},categories:{display:"flex",flexDirection:"column",gap:22},category:{display:"flex",flexDirection:"column",gap:12},categoryTitle:{margin:0,fontSize:15,color:"#334155"},questions:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14},questionCard:{padding:16,border:"1px solid #e2e8f0",borderRadius:11},questionHeader:{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"},description:{margin:"5px 0 0",fontSize:13,color:"#64748b"},trigger:{padding:"4px 8px",borderRadius:999,background:"#ede9fe",color:"#6d28d9",fontSize:11,fontWeight:700},profile:{padding:"4px 8px",borderRadius:999,background:"#e0f2fe",color:"#0369a1",fontSize:11,fontWeight:700},options:{display:"flex",gap:8,marginTop:14},option:{flex:1,padding:"9px 10px",border:"1px solid",borderRadius:8,fontWeight:700,cursor:"pointer"},observation:{width:"100%",boxSizing:"border-box",minHeight:70,marginTop:10,padding:"9px 11px",border:"1px solid #cbd5e1",borderRadius:8,resize:"vertical"},footer:{display:"flex",justifyContent:"flex-end",paddingTop:20},primary:{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 16px",border:0,borderRadius:9,background:"#2563eb",color:"#fff",fontWeight:700,cursor:"pointer"},suggestionList:{display:"flex",flexDirection:"column",gap:12},suggestionCard:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",padding:16,border:"1px solid #e2e8f0",borderRadius:11},status:{padding:"4px 8px",borderRadius:999,background:"#f1f5f9",color:"#475569",fontSize:11,fontWeight:700,textTransform:"capitalize"},productName:{margin:"7px 0 0",color:"#0f172a"},management:{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"},secondary:{padding:"9px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",fontWeight:600,cursor:"pointer"},reject:{padding:"9px 12px",border:"1px solid #fecaca",borderRadius:8,background:"#fff",color:"#b91c1c",fontWeight:600,cursor:"pointer"},accept:{padding:"9px 12px",border:0,borderRadius:8,background:"#16a34a",color:"#fff",fontWeight:700,cursor:"pointer"},success:{display:"flex",gap:9,alignItems:"center",padding:13,marginBottom:16,border:"1px solid #86efac",borderRadius:9,background:"#f0fdf4",color:"#166534"},error:{display:"flex",gap:9,alignItems:"center",padding:13,marginBottom:16,border:"1px solid #fecaca",borderRadius:9,background:"#fef2f2",color:"#b91c1c"},empty:{padding:30,textAlign:"center",color:"#64748b"}};
