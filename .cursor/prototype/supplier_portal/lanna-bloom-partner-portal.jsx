import { useState } from "react";

const T = {
  cream: "#FAF7F2", white: "#FFFFFF", sage: "#7A8C6E", sageDark: "#5C6E50",
  sageLight: "#EEF2EA", rose: "#C8836A", roseLight: "#F7EDE8",
  charcoal: "#2C2C2C", grey: "#6B6B6B", greyLight: "#E8E4DE", border: "#DDD8D0",
  success: "#4A7C59", successLight: "#E8F3EC", warning: "#B8860B", warningLight: "#FFF8E1",
  error: "#C0392B", errorLight: "#FDECEA",
};

const Badge = ({ status }) => {
  const m = {
    pending: { th: "รอการอนุมัติ", en: "Pending", bg: T.warningLight, c: T.warning },
    approved: { th: "อนุมัติแล้ว", en: "Approved", bg: T.successLight, c: T.success },
    active: { th: "ใช้งานได้", en: "Active", bg: T.sageLight, c: T.sageDark },
    rejected: { th: "ไม่ผ่าน", en: "Rejected", bg: T.errorLight, c: T.error },
    submitted: { th: "ส่งแล้ว", en: "Submitted", bg: "#EEF2F8", c: "#3A5A8C" },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", padding:"4px 12px", borderRadius:20, background:s.bg, fontSize:12, fontWeight:700, color:s.c, lineHeight:1.4 }}>
      {s.th}<span style={{fontSize:10,fontWeight:400,opacity:.75}}>{s.en}</span>
    </span>
  );
};

const Btn = ({ children, variant="primary", onClick, style:s, icon, small }) => {
  const v = {
    primary:   { background:T.sage,   color:"#fff",       border:"none" },
    secondary: { background:"transparent", color:T.sage,   border:`1.5px solid ${T.sage}` },
    ghost:     { background:"transparent", color:T.grey,   border:`1.5px solid ${T.border}` },
    rose:      { background:T.rose,   color:"#fff",       border:"none" },
    danger:    { background:T.error,  color:"#fff",       border:"none" },
  };
  return (
    <button onClick={onClick} style={{ ...v[variant], padding:small?"7px 14px":"11px 22px", borderRadius:10, fontSize:small?13:14, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, fontFamily:"inherit", transition:"opacity .15s", whiteSpace:"nowrap", ...s }}
      onMouseEnter={e=>e.currentTarget.style.opacity=".82"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      {icon&&<span>{icon}</span>}{children}
    </button>
  );
};

const Inp = ({ label, sub, placeholder, value, onChange, type="text", req }) => (
  <div style={{marginBottom:18}}>
    <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4,color:T.charcoal}}>
      {label}{req&&<span style={{color:T.rose}}> *</span>}
      {sub&&<span style={{display:"block",fontSize:11,color:T.grey,fontWeight:400}}>{sub}</span>}
    </label>
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:"inherit",background:T.white,color:T.charcoal,outline:"none",boxSizing:"border-box"}}
      onFocus={e=>e.target.style.borderColor=T.sage} onBlur={e=>e.target.style.borderColor=T.border} />
  </div>
);

const Sel = ({ label, sub, options, value, onChange, req }) => (
  <div style={{marginBottom:18}}>
    <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4}}>
      {label}{req&&<span style={{color:T.rose}}> *</span>}
      {sub&&<span style={{display:"block",fontSize:11,color:T.grey,fontWeight:400}}>{sub}</span>}
    </label>
    <select value={value} onChange={onChange}
      style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:"inherit",background:T.white,color:T.charcoal,outline:"none",boxSizing:"border-box"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ label, sub, value, onChange }) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,padding:"12px 16px",background:T.white,borderRadius:12,border:`1.5px solid ${T.border}`}}>
    <div><div style={{fontSize:14,fontWeight:600}}>{label}</div>{sub&&<div style={{fontSize:11,color:T.grey}}>{sub}</div>}</div>
    <div onClick={()=>onChange(!value)} style={{width:44,height:26,borderRadius:13,background:value?T.sage:T.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
    </div>
  </div>
);

const Card = ({children,style:s})=>(
  <div style={{background:T.white,borderRadius:16,padding:"20px",border:`1px solid ${T.border}`,...s}}>{children}</div>
);

const SecTitle = ({th,en})=>(
  <div style={{marginBottom:16}}>
    <div style={{fontSize:18,fontWeight:700,color:T.charcoal}}>{th}</div>
    <div style={{fontSize:11,color:T.grey,marginTop:2}}>{en}</div>
  </div>
);

const Chips = ({ options, selected, onToggle, multi=true }) => (
  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
    {options.map(o=>{
      const active = multi ? selected.includes(o.value) : selected===o.value;
      return (
        <button key={o.value} onClick={()=>onToggle(o.value)} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${active?T.sage:T.border}`,background:active?T.sageLight:T.white,color:active?T.sageDark:T.grey,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
          {o.icon}{o.label}
        </button>
      );
    })}
  </div>
);

const Stepper = ({steps,current})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28}}>
    {steps.map((s,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:i<current?T.sage:i===current?T.rose:T.border,color:i<=current?"#fff":T.grey,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>
            {i<current?"✓":i+1}
          </div>
          <div style={{fontSize:10,color:i===current?T.charcoal:T.grey,marginTop:4,fontWeight:i===current?700:400,textAlign:"center",maxWidth:60}}>{s}</div>
        </div>
        {i<steps.length-1&&<div style={{width:28,height:2,background:i<current?T.sage:T.border,margin:"0 4px",marginBottom:20}}/>}
      </div>
    ))}
  </div>
);

const Nav=({screen,setScreen})=>(
  <nav style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:8}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:22}}>🌸</span>
      <div>
        <div style={{fontSize:14,fontWeight:800,color:T.charcoal,lineHeight:1.1}}>Lanna Bloom</div>
        <div style={{fontSize:9,color:T.grey,letterSpacing:1}}>PARTNER PORTAL</div>
      </div>
    </div>
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {[{id:"apply",label:"สมัคร Partner"},{id:"dashboard",label:"Dashboard"},{id:"addProduct",label:"เพิ่มสินค้า"},{id:"admin",label:"🔐 Admin"}].map(s=>(
        <button key={s.id} onClick={()=>setScreen(s.id)} style={{padding:"5px 10px",borderRadius:8,background:screen===s.id?T.sageLight:"transparent",color:screen===s.id?T.sageDark:T.grey,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          {s.label}
        </button>
      ))}
    </div>
  </nav>
);

/* ── SCREEN A: Apply ───────────────────────────────────────────── */
const ApplyScreen=()=>{
  const [step,setStep]=useState(0);
  const [done,setDone]=useState(false);
  const [f,setF]=useState({shopName:"",contactName:"",lineId:"",phone:"",ig:"",fb:"",address:"",district:"",selfDeliver:false,deliveryZone:"",deliveryFee:"",categories:[],prepTime:"60",cutoff:"",maxOrders:"",note:""});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const steps=["ข้อมูลติดต่อ","สถานที่","หมวดหมู่","ตัวอย่างงาน"];
  const catOpts=[{value:"flowers",label:"ดอกไม้",icon:"🌸"},{value:"balloons",label:"บอลลูน",icon:"🎈"},{value:"gifts",label:"ของขวัญ",icon:"🎁"},{value:"money",label:"ดอกไม้ธนบัตร",icon:"💵"},{value:"handmade",label:"งานประดิษฐ์",icon:"✂️"}];
  const districts=[{value:"",label:"เลือกอำเภอ…"},{value:"muang",label:"อ.เมืองเชียงใหม่"},{value:"hangdong",label:"หางดง"},{value:"saraphi",label:"สารภี"},{value:"sansai",label:"สันทราย"},{value:"doisaket",label:"ดอยสะเก็ด"},{value:"santitham",label:"สันติธรรม"}];

  if(done)return(
    <div style={{maxWidth:480,margin:"0 auto",padding:"40px 20px",textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>🌸</div>
      <h2 style={{fontSize:24,fontWeight:800,marginBottom:6}}>ส่งใบสมัครแล้ว!</h2>
      <p style={{color:T.grey,marginBottom:4,fontSize:13}}>Application Submitted Successfully</p>
      <Card style={{textAlign:"left",marginTop:24}}>
        <p style={{fontSize:14,lineHeight:1.9}}>🙏 ขอบคุณที่สนใจเป็น Partner กับ Lanna Bloom</p>
        <p style={{fontSize:14,lineHeight:1.9}}>✅ ทีมงานจะติดต่อกลับผ่าน <strong>LINE</strong> ภายใน 1–2 วันทำการ</p>
        <p style={{fontSize:11,color:T.grey}}>We'll reach out via LINE within 1–2 business days.</p>
        <div style={{marginTop:16,padding:"12px",background:T.sageLight,borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24}}>💬</span>
          <div><div style={{fontSize:13,fontWeight:700}}>LINE ID: {f.lineId||"(ตามที่กรอก)"}</div><div style={{fontSize:11,color:T.grey}}>เราจะ add คุณในไม่ช้า</div></div>
        </div>
      </Card>
      <Btn onClick={()=>{setDone(false);setStep(0);}} style={{marginTop:20}} variant="secondary">← กลับหน้าหลัก</Btn>
    </div>
  );

  return(
    <div style={{maxWidth:520,margin:"0 auto",padding:"28px 20px"}}>
      {step===0&&(
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:12,color:T.rose,fontWeight:700,letterSpacing:1,marginBottom:6}}>LANNA BLOOM × PARTNER</div>
          <h1 style={{fontSize:26,fontWeight:800,marginBottom:14,lineHeight:1.3}}>ร่วมเป็น Partner<br/>กับ Lanna Bloom 🌸</h1>
          <div style={{background:T.sageLight,borderRadius:14,padding:"16px 20px",marginBottom:20,textAlign:"left"}}>
            {[["🛒","รับออเดอร์จากลูกค้าในเชียงใหม่","Receive orders from Chiang Mai customers"],["📦","เราช่วยจัดการระบบให้","Platform-managed logistics & payments"],["💬","ติดต่อง่ายผ่าน LINE ตลอด","Always connected via LINE support"]].map(([ic,th,en])=>(
              <div key={th} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
                <div><div style={{fontSize:13,fontWeight:600}}>{th}</div><div style={{fontSize:11,color:T.grey}}>{en}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Stepper steps={steps} current={step}/>
      <Card>
        {step===0&&(<>
          <SecTitle th="ข้อมูลติดต่อ" en="Contact Information"/>
          <Inp label="ชื่อร้าน / Shop Name" sub="ชื่อที่แสดงในระบบ" req placeholder="เช่น ร้านดอกไม้มาลี" value={f.shopName} onChange={e=>u("shopName",e.target.value)}/>
          <Inp label="ชื่อผู้ติดต่อ / Contact Person" req placeholder="ชื่อ-นามสกุล" value={f.contactName} onChange={e=>u("contactName",e.target.value)}/>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4}}>LINE ID <span style={{color:T.rose}}>*</span></label>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="@lineid" value={f.lineId} onChange={e=>u("lineId",e.target.value)} style={{flex:1,padding:"11px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.sage} onBlur={e=>e.target.style.borderColor=T.border}/>
              <Btn variant="ghost" small>💬 เปิด LINE</Btn>
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4}}>เบอร์โทร / Phone <span style={{color:T.rose}}>*</span></label>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="08X-XXX-XXXX" value={f.phone} onChange={e=>u("phone",e.target.value)} type="tel" style={{flex:1,padding:"11px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.sage} onBlur={e=>e.target.style.borderColor=T.border}/>
              <Btn variant="ghost" small>📞 โทร</Btn>
            </div>
          </div>
          <Inp label="Instagram (ถ้ามี)" sub="Optional" placeholder="@yourshop" value={f.ig} onChange={e=>u("ig",e.target.value)}/>
          <Inp label="Facebook (ถ้ามี)" sub="Optional" placeholder="facebook.com/yourshop" value={f.fb} onChange={e=>u("fb",e.target.value)}/>
        </>)}

        {step===1&&(<>
          <SecTitle th="สถานที่และการจัดส่ง" en="Location & Delivery"/>
          <Inp label="ที่อยู่ร้าน / Shop Address" req placeholder="บ้านเลขที่ ซอย ถนน ตำบล" value={f.address} onChange={e=>u("address",e.target.value)}/>
          <Sel label="อำเภอ / District" req options={districts} value={f.district} onChange={e=>u("district",e.target.value)}/>
          <div style={{marginBottom:18,padding:"14px",background:T.greyLight,borderRadius:12,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span style={{fontSize:20}}>📍</span>
            <div><div style={{fontSize:13,fontWeight:600}}>ปักหมุดบน Google Maps</div><div style={{fontSize:11,color:T.grey}}>Pin your shop location</div></div>
            <Btn small variant="ghost" style={{marginLeft:"auto"}}>เปิด Maps</Btn>
          </div>
          <Toggle label="ร้านจัดส่งเองได้" sub="Self-delivery capability" value={f.selfDeliver} onChange={v=>u("selfDeliver",v)}/>
          {f.selfDeliver&&(
            <div style={{background:T.sageLight,borderRadius:12,padding:"14px",marginTop:-10,marginBottom:18}}>
              <Inp label="พื้นที่จัดส่ง / Delivery zones" sub="เช่น นิมมาน, เมือง, สันกำแพง" placeholder="ระบุย่าน/อำเภอ" value={f.deliveryZone} onChange={e=>u("deliveryZone",e.target.value)}/>
              <Inp label="ค่าจัดส่ง / Delivery fee" sub="เช่น ฟรีในรัศมี 5 กม." placeholder="฿ หรือ นโยบาย" value={f.deliveryFee} onChange={e=>u("deliveryFee",e.target.value)}/>
            </div>
          )}
          {!f.selfDeliver&&(
            <div style={{background:T.warningLight,borderRadius:12,padding:"12px 14px",fontSize:13,color:T.warning,marginBottom:18}}>
              📦 ใช้ระบบจัดส่งของ Lanna Bloom — We'll handle delivery for you
            </div>
          )}
        </>)}

        {step===2&&(<>
          <SecTitle th="หมวดหมู่และกำลังการผลิต" en="Categories & Capacity"/>
          <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>หมวดหมู่สินค้า <span style={{color:T.rose}}>*</span></div>
          <Chips options={catOpts} selected={f.categories} onToggle={v=>u("categories",f.categories.includes(v)?f.categories.filter(x=>x!==v):[...f.categories,v])}/>
          <Sel label="เวลาเตรียมงาน / Prep time" sub="Typical preparation time" req options={[{value:"30",label:"30 นาที"},{value:"60",label:"1 ชั่วโมง"},{value:"120",label:"2 ชั่วโมง"},{value:"240",label:"4+ ชั่วโมง"}]} value={f.prepTime} onChange={e=>u("prepTime",e.target.value)}/>
          <Inp label="รับออเดอร์ Same-day ถึงกี่โมง" sub="Same-day cutoff (optional)" placeholder="เช่น 14:00" value={f.cutoff} onChange={e=>u("cutoff",e.target.value)}/>
          <Inp label="รับออเดอร์สูงสุดต่อวัน" sub="Max orders/day (optional)" placeholder="เช่น 20" value={f.maxOrders} onChange={e=>u("maxOrders",e.target.value)} type="number"/>
        </>)}

        {step===3&&(<>
          <SecTitle th="ตัวอย่างผลงาน" en="Portfolio Samples"/>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>อัปโหลดรูปตัวอย่าง 1–3 รูป <span style={{color:T.rose}}>*</span></div>
            <div style={{fontSize:11,color:T.grey,marginBottom:10}}>Upload 1–3 sample photos of your work</div>
            <div style={{display:"flex",gap:10}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:90,height:90,borderRadius:12,border:`2px dashed ${T.border}`,background:i===0?T.sageLight:T.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,color:T.grey,gap:4}}>
                  {i===0?<><span style={{fontSize:20}}>🌸</span>ตัวอย่าง</>:<><span style={{fontSize:20}}>+</span>เพิ่ม</>}
                </div>
              ))}
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4}}>ประสบการณ์ / About your shop <span style={{fontSize:11,color:T.grey,fontWeight:400}}>Optional</span></label>
            <textarea placeholder="เล่าเกี่ยวกับร้านของคุณ ความเชี่ยวชาญ ประสบการณ์..." value={f.note} onChange={e=>u("note",e.target.value)}
              style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:"inherit",resize:"vertical",minHeight:90,outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=T.sage} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div style={{background:T.sageLight,borderRadius:12,padding:"14px",fontSize:13}}>
            🙏 กดส่งเพื่อให้ทีม Lanna Bloom ตรวจสอบใบสมัครของคุณ<br/>
            <span style={{color:T.grey,fontSize:11}}>Submit to send your application for review. We'll contact you on LINE.</span>
          </div>
        </>)}
      </Card>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:16,gap:12}}>
        <Btn variant="ghost" onClick={()=>step>0&&setStep(step-1)} style={{visibility:step===0?"hidden":"visible"}}>← ย้อนกลับ</Btn>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" small>💾 บันทึกต่อภายหลัง</Btn>
          {step<3?<Btn onClick={()=>setStep(step+1)}>ถัดไป →</Btn>:<Btn variant="rose" onClick={()=>setDone(true)}>ส่งใบสมัคร 🌸</Btn>}
        </div>
      </div>
    </div>
  );
};

/* ── SCREEN B: Dashboard ──────────────────────────────────────── */
const DashboardScreen=()=>{
  const [tab,setTab]=useState("overview");
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px"}}>
      <Card style={{background:`linear-gradient(135deg, ${T.sageLight} 0%, ${T.cream} 100%)`,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:12,color:T.grey,marginBottom:4}}>สวัสดี / Hello</div>
            <div style={{fontSize:20,fontWeight:800}}>ร้านดอกไม้มาลี 🌸</div>
            <div style={{fontSize:12,color:T.grey}}>Mali Flower Shop · อ.เมือง เชียงใหม่</div>
          </div>
          <Badge status="approved"/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn small variant="ghost" icon="💬">LINE Support</Btn>
          <Btn small variant="ghost" icon="📞">โทรหาเรา</Btn>
        </div>
      </Card>

      <div style={{fontSize:12,fontWeight:700,color:T.grey,marginBottom:10,letterSpacing:.5}}>QUICK ACTIONS</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {[{icon:"➕",th:"เพิ่มสินค้า",en:"Add Product",c:T.sage},{icon:"📦",th:"สินค้าของฉัน",en:"My Products",c:T.sageDark},{icon:"🛒",th:"ออเดอร์",en:"Orders (Soon)",c:T.grey,off:true},{icon:"💬",th:"ติดต่อ Lanna",en:"Contact Support",c:T.rose}].map(a=>(
          <Card key={a.en} style={{cursor:a.off?"not-allowed":"pointer",opacity:a.off?.5:1,padding:"16px"}}>
            <div style={{fontSize:24,marginBottom:8}}>{a.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:a.c}}>{a.th}</div>
            <div style={{fontSize:11,color:T.grey}}>{a.en}</div>
          </Card>
        ))}
      </div>

      <div style={{fontSize:12,fontWeight:700,color:T.grey,marginBottom:10,letterSpacing:.5}}>MY SHOP INFO</div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <SecTitle th="ข้อมูลร้าน" en="Shop Profile"/>
          <Btn small variant="secondary">แก้ไข Edit</Btn>
        </div>
        {[{icon:"📍",th:"ที่อยู่",val:"ถ.นิมมานเหมินท์ ซ.7 อ.เมือง เชียงใหม่",act:"🗺️ Maps"},{icon:"💬",th:"LINE ID",val:"@maliflower",act:"📋 Copy"},{icon:"📞",th:"โทร",val:"081-234-5678",act:"📞 Call"},{icon:"🚚",th:"การจัดส่ง",val:"จัดส่งเอง | Self-delivery",act:null},{icon:"🌸",th:"หมวดหมู่",val:"ดอกไม้, ของขวัญ",act:null},{icon:"⏱",th:"เวลาเตรียม",val:"1 ชั่วโมง | 1 Hour",act:null}].map(r=>(
          <div key={r.th} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{width:28,fontSize:16}}>{r.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:11,color:T.grey}}>{r.th}</div><div style={{fontSize:13,fontWeight:600}}>{r.val}</div></div>
            {r.act&&<Btn small variant="ghost">{r.act}</Btn>}
          </div>
        ))}
      </Card>

      <div style={{fontSize:12,fontWeight:700,color:T.grey,marginBottom:10,letterSpacing:.5}}>MY PRODUCTS</div>
      <Card>
        {[{name:"ช่อดอกไม้วาเลนไทน์",price:"฿350",status:"active",cat:"🌸"},{name:"กระเช้าของขวัญ Premium",price:"฿890",status:"submitted",cat:"🎁"},{name:"บอลลูนแฟนตาซีเซ็ต",price:"฿490",status:"pending",cat:"🎈"}].map(p=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.border}`,gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:T.sageLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{p.cat}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.name}</div><div style={{fontSize:12,color:T.sage,fontWeight:700}}>{p.price}</div></div>
            <Badge status={p.status}/>
          </div>
        ))}
        <div style={{paddingTop:12}}><Btn variant="secondary" style={{width:"100%",justifyContent:"center"}}>+ เพิ่มสินค้าใหม่</Btn></div>
      </Card>
    </div>
  );
};

/* ── SCREEN C: Add Product ────────────────────────────────────── */
const AddProductScreen=()=>{
  const [step,setStep]=useState(0);
  const [cat,setCat]=useState("");
  const [customFields,setCustomFields]=useState([]);
  const [done,setDone]=useState(false);
  const cats=[{value:"flowers",label:"ดอกไม้",en:"Flowers",icon:"🌸"},{value:"balloons",label:"บอลลูน",en:"Balloons",icon:"🎈"},{value:"gifts",label:"ของขวัญ",en:"Gifts",icon:"🎁"},{value:"money",label:"ดอกไม้ธนบัตร",en:"Money Flowers",icon:"💵"},{value:"handmade",label:"งานประดิษฐ์",en:"Handmade Floral",icon:"✂️"}];
  const steps=["หมวดหมู่","ข้อมูลหลัก","รายละเอียด","ตรวจสอบ"];

  if(done)return(
    <div style={{maxWidth:480,margin:"0 auto",padding:"40px 20px",textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>✅</div>
      <h2 style={{fontSize:22,fontWeight:800,marginBottom:6}}>ส่งสินค้าแล้ว!</h2>
      <p style={{color:T.grey,fontSize:13}}>Product submitted for review</p>
      <Card style={{marginTop:20,textAlign:"left"}}>
        <p style={{fontSize:14,lineHeight:1.9,marginBottom:10}}>🌸 สินค้าของคุณอยู่ระหว่างการตรวจสอบ — ทีมงานจะแจ้งผลผ่าน LINE</p>
        <Badge status="submitted"/>
      </Card>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20}}>
        <Btn variant="secondary" onClick={()=>{setDone(false);setStep(0);setCat("");}}>+ เพิ่มสินค้าอื่น</Btn>
        <Btn>ดูสินค้าทั้งหมด</Btn>
      </div>
    </div>
  );

  return(
    <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px"}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>เพิ่มสินค้า</div>
      <div style={{fontSize:12,color:T.grey,marginBottom:24}}>Add New Product</div>
      <Stepper steps={steps} current={step}/>
      <Card>
        {step===0&&(<>
          <SecTitle th="เลือกหมวดหมู่" en="Select Category"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {cats.map(c=>(
              <div key={c.value} onClick={()=>setCat(c.value)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:`1.5px solid ${cat===c.value?T.sage:T.border}`,background:cat===c.value?T.sageLight:T.white,cursor:"pointer",transition:"all .15s"}}>
                <span style={{fontSize:26}}>{c.icon}</span>
                <div><div style={{fontSize:14,fontWeight:700}}>{c.label}</div><div style={{fontSize:11,color:T.grey}}>{c.en}</div></div>
                {cat===c.value&&<span style={{marginLeft:"auto",color:T.sage,fontWeight:800,fontSize:18}}>✓</span>}
              </div>
            ))}
          </div>
        </>)}

        {step===1&&(<>
          <SecTitle th="ข้อมูลหลัก" en="Core Details"/>
          <Inp label="ชื่อสินค้า (ภาษาไทย)" req placeholder="เช่น ช่อดอกไม้วาเลนไทน์"/>
          <Inp label="Product name (English)" placeholder="e.g. Valentine Flower Bouquet"/>
          <Inp label="ราคา / Price (฿)" req placeholder="350" type="number"/>
          <Sel label="เวลาเตรียมงาน / Prep time" req options={[{value:"30",label:"30 นาที"},{value:"60",label:"1 ชั่วโมง"},{value:"120",label:"2 ชั่วโมง"},{value:"240",label:"4+ ชั่วโมง"}]}/>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:8}}>รูปสินค้า / Product Images</label>
            <div style={{display:"flex",gap:10}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:82,height:82,borderRadius:10,border:`2px dashed ${T.border}`,background:T.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,color:T.grey,gap:4}}>
                  <span style={{fontSize:18}}>+</span>รูป
                </div>
              ))}
            </div>
          </div>
        </>)}

        {step===2&&(<>
          <SecTitle th="รายละเอียดตามหมวดหมู่" en="Category-Specific Details"/>
          {cat==="flowers"&&(
            <div style={{background:T.sageLight,borderRadius:12,padding:"16px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>🌸 ดอกไม้ / Flowers</div>
              <div style={{fontSize:12,color:T.grey,marginBottom:10}}>ใช้ template มาตรฐาน Lanna Bloom สำหรับดอกไม้</div>
              <Btn variant="secondary" small icon="📋">Use Existing Flower Template</Btn>
            </div>
          )}
          {cat==="balloons"&&(<>
            <Inp label="จำนวนบอลลูน / Quantity" type="number" placeholder="12"/>
            <Sel label="ขนาด / Size" options={[{value:"s",label:"เล็ก S"},{value:"m",label:"กลาง M"},{value:"l",label:"ใหญ่ L"},{value:"xl",label:"ใหญ่มาก XL"}]}/>
            <Inp label="สี / Colors" placeholder="เช่น ชมพู, ขาว, ทอง"/>
            <Toggle label="รับปรับข้อความได้" sub="Custom text on balloons" value={false} onChange={()=>{}}/>
          </>)}
          {cat==="gifts"&&(<>
            <Sel label="ประเภทของขวัญ / Gift type" options={[{value:"basket",label:"กระเช้า"},{value:"box",label:"กล่อง"},{value:"bag",label:"ถุง"}]}/>
            <Sel label="ขนาด / Size" options={[{value:"s",label:"S"},{value:"m",label:"M"},{value:"l",label:"L"},{value:"xl",label:"XL"}]}/>
            <Toggle label="รับ Personalization" sub="Custom message / packaging" value={false} onChange={()=>{}}/>
          </>)}
          {cat==="money"&&(<>
            <Inp label="จำนวนเงิน / Amount (฿)" type="number" placeholder="1000"/>
            <Toggle label="ธนบัตรจริง / Real banknotes" sub="ลูกค้าต้องเตรียมเงินสด" value={false} onChange={()=>{}}/>
            <Toggle label="ต้องวางมัดจำ / Deposit required" value={false} onChange={()=>{}}/>
          </>)}
          {cat==="handmade"&&(<>
            <Sel label="ประเภทงาน / Product type" options={[{value:"wreath",label:"พวงหรีด Wreath"},{value:"crown",label:"มงกุฎดอกไม้"},{value:"arrangement",label:"จัดดอกไม้ตกแต่ง"}]}/>
            <Sel label="ขนาด / Size class" options={[{value:"s",label:"S – เล็ก"},{value:"m",label:"M – กลาง"},{value:"l",label:"L – ใหญ่"}]}/>
            <Toggle label="สินค้าแตกง่าย / Fragile" sub="ต้องการการขนส่งพิเศษ" value={false} onChange={()=>{}}/>
            <Toggle label="รับ Personalization" value={false} onChange={()=>{}}/>
          </>)}
          {!cat&&<div style={{textAlign:"center",padding:"20px",color:T.grey,fontSize:13}}>← กลับไปเลือกหมวดหมู่ก่อน<br/><span style={{fontSize:11}}>Please go back and select a category</span></div>}
          {/* Custom Fields */}
          <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>🔧 Custom Attributes</div>
            <div style={{fontSize:11,color:T.grey,marginBottom:10}}>เพิ่มข้อมูลพิเศษที่ต้องการ / Add custom fields</div>
            {customFields.map((cf,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                <input placeholder="ชื่อ attribute" defaultValue={cf.label} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                <select style={{padding:"9px 10px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,fontFamily:"inherit"}}>
                  <option>text</option><option>number</option><option>yes/no</option><option>select</option>
                </select>
                <button onClick={()=>setCustomFields(f=>f.filter((_,j)=>j!==i))} style={{padding:"9px 10px",border:"none",background:T.errorLight,borderRadius:8,cursor:"pointer",color:T.error,fontFamily:"inherit"}}>✕</button>
              </div>
            ))}
            <Btn variant="ghost" small onClick={()=>setCustomFields(f=>[...f,{label:"",type:"text"}])}>+ Add Custom Field</Btn>
          </div>
        </>)}

        {step===3&&(<>
          <SecTitle th="ตรวจสอบและส่ง" en="Review & Submit"/>
          <div style={{background:T.sageLight,borderRadius:12,padding:"16px",marginBottom:18}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:28}}>{cats.find(c=>c.value===cat)?.icon||"📦"}</span>
              <div><div style={{fontSize:15,fontWeight:700}}>{cats.find(c=>c.value===cat)?.label||"สินค้าใหม่"}</div><div style={{fontSize:11,color:T.grey}}>Ready to submit for review</div></div>
            </div>
            {[["หมวดหมู่",cats.find(c=>c.value===cat)?.label||"-"],["เวลาเตรียม","1 ชั่วโมง"],["ราคา","฿350"],["สถานะหลังส่ง","Submitted → รอตรวจสอบ"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                <span style={{color:T.grey}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:T.grey,lineHeight:1.8}}>
            หลังจากส่ง ทีม Lanna Bloom จะตรวจสอบสินค้าและแจ้งผลผ่าน LINE<br/>
            <span style={{fontSize:11}}>After submission, our team reviews and notifies you via LINE.</span>
          </div>
        </>)}
      </Card>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:16,gap:12}}>
        <Btn variant="ghost" onClick={()=>step>0&&setStep(step-1)} style={{visibility:step===0?"hidden":"visible"}}>← ย้อนกลับ</Btn>
        {step<3?<Btn onClick={()=>setStep(step+1)} style={{marginLeft:"auto"}}>ถัดไป →</Btn>:<Btn variant="rose" onClick={()=>setDone(true)} style={{marginLeft:"auto"}}>ส่งสินค้า 🌸</Btn>}
      </div>
    </div>
  );
};

/* ── SCREEN D: Admin Panel ────────────────────────────────────── */
const AdminScreen=()=>{
  const [filter,setFilter]=useState("all");
  const [selected,setSelected]=useState(null);
  const [statuses,setStatuses]=useState({1:"pending",2:"pending",3:"approved",4:"rejected"});

  const apps=[
    {id:1,shop:"ร้านดอกไม้มาลี",contact:"คุณมาลี",line:"@maliflower",phone:"081-234-5678",district:"อ.เมือง",deliver:true,cats:["🌸","🎁"],submitted:"25 ก.พ. 2568"},
    {id:2,shop:"บอลลูนแฟนตาซี",contact:"คุณโอ๊ต",line:"@oatballoon",phone:"089-876-5432",district:"หางดง",deliver:false,cats:["🎈"],submitted:"26 ก.พ. 2568"},
    {id:3,shop:"ของขวัญพรีเมียม",contact:"คุณนุ่น",line:"@nungift",phone:"086-111-2222",district:"สันทราย",deliver:true,cats:["🎁","💵"],submitted:"20 ก.พ. 2568"},
    {id:4,shop:"ดอกไม้ธนบัตรเชียงใหม่",contact:"คุณเต้",line:"@taemoney",phone:"082-333-4444",district:"สารภี",deliver:false,cats:["💵"],submitted:"18 ก.พ. 2568"},
  ];
  const appWithStatus=apps.map(a=>({...a,status:statuses[a.id]}));
  const filtered=filter==="all"?appWithStatus:appWithStatus.filter(a=>a.status===filter);
  const approve=id=>setStatuses(s=>({...s,[id]:"approved"}));
  const reject=id=>setStatuses(s=>({...s,[id]:"rejected"}));

  return(
    <div style={{maxWidth:680,margin:"0 auto",padding:"24px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800}}>Admin Panel 🔐</div><div style={{fontSize:12,color:T.grey}}>Partner Applications</div></div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {["all","pending","approved","rejected"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:filter===f?T.sage:T.greyLight,color:filter===f?"#fff":T.grey,fontFamily:"inherit"}}>
              {f==="all"?"ทั้งหมด":f==="pending"?"⏳ รอ":f==="approved"?"✅ อนุมัติ":"❌ ไม่ผ่าน"}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {[{label:"รอดำเนินการ",en:"Pending",count:Object.values(statuses).filter(s=>s==="pending").length,c:T.warning},{label:"อนุมัติแล้ว",en:"Approved",count:Object.values(statuses).filter(s=>s==="approved").length,c:T.success},{label:"ไม่ผ่าน",en:"Rejected",count:Object.values(statuses).filter(s=>s==="rejected").length,c:T.error}].map(s=>(
          <Card key={s.en} style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:26,fontWeight:800,color:s.c}}>{s.count}</div>
            <div style={{fontSize:12,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:10,color:T.grey}}>{s.en}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(a=>(
          <Card key={a.id} style={{cursor:"pointer",borderColor:selected===a.id?T.sage:T.border,transition:"border-color .15s"}} onClick={()=>setSelected(selected===a.id?null:a.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>{a.shop}</div>
                <div style={{fontSize:12,color:T.grey}}>{a.contact} · {a.district}</div>
                <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}>
                  {a.cats.map(c=><span key={c} style={{fontSize:16}}>{c}</span>)}
                  <span style={{fontSize:11,color:T.grey,marginLeft:4}}>{a.deliver?"🚚 Self-delivery":"📦 Platform delivery"}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <Badge status={a.status}/>
                <div style={{fontSize:10,color:T.grey}}>{a.submitted}</div>
                <div style={{fontSize:11,color:T.grey}}>{selected===a.id?"▲ ปิด":"▼ ดูรายละเอียด"}</div>
              </div>
            </div>
            {selected===a.id&&(
              <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  <Btn small variant="ghost" icon="💬" onClick={e=>{e.stopPropagation();}}>LINE: {a.line}</Btn>
                  <Btn small variant="ghost" icon="📞" onClick={e=>{e.stopPropagation();}}>{a.phone}</Btn>
                  <Btn small variant="ghost" icon="🗺️" onClick={e=>{e.stopPropagation();}}>Google Maps</Btn>
                </div>
                <div style={{background:T.greyLight,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:T.grey}}>การจัดส่ง / Delivery</span>
                  <span style={{fontWeight:700}}>{a.deliver?"จัดส่งเอง (Self-delivery)":"ใช้ Platform delivery"}</span>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {a.status==="pending"&&(<>
                    <Btn small icon="✅" onClick={e=>{e.stopPropagation();approve(a.id);}}>อนุมัติ Approve</Btn>
                    <Btn small variant="ghost" icon="✏️" onClick={e=>e.stopPropagation()}>ขอแก้ไข</Btn>
                    <Btn small variant="danger" icon="✕" onClick={e=>{e.stopPropagation();reject(a.id);}}>ไม่ผ่าน Reject</Btn>
                  </>)}
                  {a.status==="approved"&&<div style={{fontSize:13,color:T.success,fontWeight:700}}>✅ Partner Active แล้ว!</div>}
                  {a.status==="rejected"&&<Btn small variant="secondary">รับสมัครใหม่</Btn>}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ── Root ─────────────────────────────────────────────────────── */
export default function App(){
  const [screen,setScreen]=useState("apply");
  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#FAF7F2;}
        input,select,textarea,button{font-family:'Sarabun',sans-serif;}
      `}</style>
      <div style={{fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",background:T.cream,minHeight:"100vh",color:T.charcoal}}>
        <Nav screen={screen} setScreen={setScreen}/>
        {screen==="apply"&&<ApplyScreen/>}
        {screen==="dashboard"&&<DashboardScreen/>}
        {screen==="addProduct"&&<AddProductScreen/>}
        {screen==="admin"&&<AdminScreen/>}
        <div style={{textAlign:"center",padding:"28px 20px 40px",fontSize:11,color:T.grey}}>
          Lanna Bloom Partner Portal · Prototype v1.0 — Navigate screens using the top nav bar
        </div>
      </div>
    </>
  );
}
