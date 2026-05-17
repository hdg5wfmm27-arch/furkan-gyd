import { useState, useEffect } from "react";

// ── SUPABASE CONFIG ────────────────────────────────────────
const SB_URL = "https://siybykxwcaxqwgbhzqvw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeWJ5a3h3Y2F4cXdnYmh6cXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTUxOTcsImV4cCI6MjA5NDU5MTE5N30.uL84a5dNamweOQcxDSbPArubJK4lNo9F9VQW9THek_0";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "return=representation",
};

const sbFetch = async (method, path, body) => {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

// ── CONSTANTS ──────────────────────────────────────────────
const ADMIN_USER = "furkan";
const ADMIN_PASS = "1234";

const EMPTY_FORM = {
  title: "", location: "", price: "", priceType: "Satılık",
  rooms: "2+1", area: "", floor: "", totalFloor: "",
  heating: "", age: "", dues: "",
  description: "", features: [], images: [],
};

const FEATURE_OPTIONS = [
  "Asansör","Otopark","Balkon","Teras","Havuz","Güvenlik",
  "Ebeveyn Banyosu","Amerikan Mutfak","Doğalgaz","Merkezi Isıtma",
  "Kombi","Site İçinde","Depo","Bahçe","Deniz Manzarası",
];

const ROOM_OPTIONS = ["1+0","1+1","2+1","3+1","4+1","5+1","6+1","7+1+"];

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

// ── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("customer");
  const [loginErr, setLoginErr] = useState("");
  const [loginU, setLoginU] = useState("");
  const [loginP, setLoginP] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailFrom, setDetailFrom] = useState("customer");
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [filter, setFilter] = useState({ type: "", rooms: "", q: "" });
  const [toast, setToast] = useState("");

  const loadListings = async () => {
    setLoading(true);
    try {
      const rows = await sbFetch("GET", "/listings?order=created_at.desc");
      setListings(rows.map(r => ({ ...r.data, id: r.id })));
    } catch (e) {
      showToast("❌ Bağlantı hatası: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadListings(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handleLogin = () => {
    if (loginU === ADMIN_USER && loginP === ADMIN_PASS) {
      setIsAdmin(true); setView("admin"); setLoginErr("");
    } else {
      setLoginErr("Kullanıcı adı veya şifre hatalı.");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false); setView("customer");
    setLoginU(""); setLoginP("");
  };

  const submitListing = async () => {
    if (!form.title || !form.location || !form.price) {
      showToast("⚠️ Başlık, konum ve fiyat zorunludur."); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await sbFetch("PATCH", `/listings?id=eq.${editId}`, { data: { ...form, id: editId } });
        showToast("✅ İlan güncellendi!");
      } else {
        const newId = Date.now() + "-" + slugify(form.title);
        await sbFetch("POST", "/listings", { id: newId, data: { ...form, id: newId } });
        showToast("✅ İlan yayınlandı!");
      }
      await loadListings();
      setForm(EMPTY_FORM); setEditId(null); setView("admin");
    } catch (e) {
      showToast("❌ Kayıt hatası: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (id) => {
    try {
      await sbFetch("DELETE", `/listings?id=eq.${id}`);
      showToast("🗑️ İlan silindi.");
      await loadListings();
    } catch (e) {
      showToast("❌ Silme hatası: " + e.message);
    }
  };

  const editListing = (l) => {
    setForm({ ...l }); setEditId(l.id); setView("form");
  };

  const openDetail = (l, from) => {
    setDetail(l); setImgIdx(0); setDetailFrom(from); setView("detail");
    setLightbox(false);
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({ ...f, images: [...f.images, ev.target.result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const filtered = listings.filter(l => {
    if (filter.type && l.priceType !== filter.type) return false;
    if (filter.rooms && l.rooms !== filter.rooms) return false;
    if (filter.q && !l.title?.toLowerCase().includes(filter.q.toLowerCase()) &&
        !l.location?.toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* LIGHTBOX */}
      {lightbox && detail?.images?.length > 0 && (
        <div style={S.lbOverlay} onClick={() => setLightbox(false)}>
          <button style={S.lbClose} onClick={() => setLightbox(false)}>✕</button>
          <button style={{...S.lbArrow, left:20}} onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+detail.images.length)%detail.images.length)}}>‹</button>
          <img src={detail.images[imgIdx]} style={S.lbImg} alt="" onClick={e=>e.stopPropagation()}/>
          <button style={{...S.lbArrow, right:20}} onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%detail.images.length)}}>›</button>
          <div style={S.lbDots}>
            {detail.images.map((_,i)=>(
              <div key={i} onClick={e=>{e.stopPropagation();setImgIdx(i)}}
                style={{width:i===imgIdx?28:9,height:9,borderRadius:9,background:i===imgIdx?"#b5936a":"rgba(255,255,255,0.45)",cursor:"pointer",transition:"all 0.2s"}}/>
            ))}
          </div>
          <div style={S.lbCounter}>{imgIdx+1} / {detail.images.length}</div>
        </div>
      )}

      {/* ── CUSTOMER VIEW ── */}
      {view === "customer" && (
        <div>
          <nav style={S.nav}>
            <div style={S.logo}>Furkan Ünal <span style={S.logoSpan}>GYD</span></div>
            <button style={S.navBtn} onClick={() => setView("login")}>🔐 Admin Girişi</button>
          </nav>

          <div style={S.hero}>
            <div style={S.heroOverlay}/>
            <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
              <div style={S.heroTag}>🏠 Gayrimenkul Değerleme Danışmanı</div>
              <h1 style={S.heroH1}>Hayalindeki Evi<br/><em style={{color:"#b5936a",fontStyle:"normal"}}>Furkan Ünal ile Bul</em></h1>
              <p style={S.heroP}>Güncel ve doğrulanmış ilanları inceleyin, doğrudan danışmanınıza ulaşın.</p>
              <div style={S.searchBar}>
                <input style={S.searchInput} placeholder="Şehir veya ilan ara…"
                  value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))}/>
                <select style={S.searchSelect} value={filter.type}
                  onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
                  <option value="">Tüm İlanlar</option>
                  <option>Satılık</option><option>Kiralık</option>
                </select>
                <select style={S.searchSelect} value={filter.rooms}
                  onChange={e=>setFilter(f=>({...f,rooms:e.target.value}))}>
                  <option value="">Oda Sayısı</option>
                  {ROOM_OPTIONS.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.secHeader}>
              <h2 style={S.secH2}>Güncel İlanlar <span style={{fontSize:"1rem",color:"#999",fontFamily:"sans-serif",fontWeight:400}}>({filtered.length})</span></h2>
            </div>

            {loading ? (
              <div style={S.empty}><div style={{fontSize:"2rem"}}>⏳</div><div style={{color:"#999",marginTop:10}}>Yükleniyor…</div></div>
            ) : filtered.length === 0 ? (
              <div style={S.empty}><div style={{fontSize:"3rem"}}>🏗️</div><div style={{color:"#999",marginTop:10}}>Henüz ilan bulunmuyor.</div></div>
            ) : (
              <div style={S.grid}>
                {filtered.map((l,i) => (
                  <div key={l.id} className="card" style={{...S.card,animationDelay:`${i*0.07}s`}} onClick={()=>openDetail(l,"customer")}>
                    <div style={S.cardImgWrap}>
                      {l.images?.length > 0
                        ? <img src={l.images[0]} style={S.cardImg} alt={l.title}/>
                        : <div style={{...S.cardImg,...S.imgPlaceholder}}>🏠</div>}
                      <span style={{...S.badge,background:l.priceType==="Kiralık"?"#3d8a5e":"#b5936a"}}>{l.priceType}</span>
                      {l.images?.length > 1 && <span style={S.imgCount}>📷 {l.images.length}</span>}
                    </div>
                    <div style={S.cardBody}>
                      <div style={S.cardPrice}>
                        {l.price ? `₺${Number(l.price).toLocaleString("tr-TR")}${l.priceType==="Kiralık"?" / ay":""}` : "–"}
                      </div>
                      <div style={S.cardTitle}>{l.title}</div>
                      <div style={S.cardLoc}>📍 {l.location}</div>
                      <div style={S.cardMeta}>
                        {l.rooms && <span style={S.metaItem}>🛏 {l.rooms}</span>}
                        {l.area  && <span style={S.metaItem}>📐 {l.area} m²</span>}
                        {l.floor && <span style={S.metaItem}>🏢 {l.floor}. Kat</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer style={S.footer}>
            <div style={{...S.logo,color:"#f7f3ee"}}>Furkan Ünal <span style={S.logoSpan}>GYD</span></div>
            <p style={{fontSize:"0.8rem",opacity:0.45,marginTop:8}}>© 2026 Furkan Ünal GYD – Tüm hakları saklıdır.</p>
          </footer>
        </div>
      )}

      {/* ── LOGIN ── */}
      {view === "login" && (
        <div style={S.loginWrap}>
          <div style={S.loginBox}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{...S.logo,fontSize:"1.8rem",color:"#2d2925"}}>Furkan Ünal <span style={S.logoSpan}>GYD</span></div>
              <p style={{color:"#999",fontSize:"0.85rem",marginTop:6}}>Admin Paneli Girişi</p>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Kullanıcı Adı</label>
              <input style={S.input} value={loginU} onChange={e=>setLoginU(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Kullanıcı adı"/>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Şifre</label>
              <input style={S.input} type="password" value={loginP} onChange={e=>setLoginP(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Şifre"/>
            </div>
            {loginErr && <div style={S.errMsg}>{loginErr}</div>}
            <button style={{...S.btnPrimary,marginTop:8}} onClick={handleLogin}>Giriş Yap</button>
            <button style={S.btnGhost} onClick={()=>setView("customer")}>← Geri Dön</button>
          </div>
        </div>
      )}

      {/* ── ADMIN ── */}
      {view === "admin" && isAdmin && (
        <div>
          <nav style={{...S.nav,background:"#1e1a17"}}>
            <div style={S.logo}>
              Furkan Ünal <span style={S.logoSpan}>GYD</span>
              <span style={{fontSize:"0.68rem",background:"#b5936a",color:"#fff",padding:"3px 10px",borderRadius:20,marginLeft:10,verticalAlign:"middle"}}>Admin</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={S.btnSm} onClick={()=>{loadListings();setView("customer")}}>👁 Siteyi Gör</button>
              <button style={{...S.btnSm,background:"rgba(224,80,80,0.2)",color:"#f9a0a0"}} onClick={handleLogout}>Çıkış</button>
            </div>
          </nav>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
              <div>
                <h2 style={{fontFamily:"Playfair Display,serif",fontSize:"1.8rem",color:"#2d2925"}}>İlan Yönetimi</h2>
                <p style={{color:"#999",fontSize:"0.85rem",marginTop:4}}>Toplam {listings.length} ilan · Supabase ✅</p>
              </div>
              <button style={{...S.btnPrimary,width:"auto",padding:"12px 24px"}}
                onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setView("form")}}>+ Yeni İlan Ekle</button>
            </div>

            {loading ? (
              <div style={S.empty}><div style={{color:"#999"}}>⏳ Yükleniyor…</div></div>
            ) : listings.length === 0 ? (
              <div style={S.empty}>
                <div style={{fontSize:"3rem"}}>📋</div>
                <p style={{color:"#999",marginTop:10}}>Henüz ilan yok.</p>
                <button style={{...S.btnPrimary,width:"auto",marginTop:16,padding:"12px 24px"}}
                  onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setView("form")}}>İlk İlanı Ekle</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {listings.map(l=>(
                  <div key={l.id} style={S.adminRow}>
                    <div style={S.adminThumb} onClick={()=>openDetail(l,"admin")}>
                      {l.images?.[0]
                        ? <img src={l.images[0]} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}} alt=""/>
                        : <div style={{width:"100%",height:"100%",background:"#e8ddd0",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem"}}>🏠</div>}
                    </div>
                    <div style={{flex:1,cursor:"pointer",minWidth:0}} onClick={()=>openDetail(l,"admin")}>
                      <div style={{fontWeight:600,color:"#2d2925",fontSize:"1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                      <div style={{color:"#888",fontSize:"0.83rem",marginTop:2}}>📍 {l.location}</div>
                      <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                        <span style={{...S.badge,position:"static",fontSize:"0.7rem",background:l.priceType==="Kiralık"?"#3d8a5e":"#b5936a"}}>{l.priceType}</span>
                        {l.rooms && <span style={S.pill}>{l.rooms}</span>}
                        {l.area  && <span style={S.pill}>{l.area} m²</span>}
                        {l.images?.length>0 && <span style={S.pill}>📷 {l.images.length}</span>}
                      </div>
                    </div>
                    <div style={{fontFamily:"Playfair Display,serif",fontSize:"1.1rem",color:"#7a5c42",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                      ₺{Number(l.price).toLocaleString("tr-TR")}{l.priceType==="Kiralık"?" /ay":""}
                    </div>
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button style={S.editBtn} onClick={()=>editListing(l)}>✏️ Düzenle</button>
                      <button style={S.delBtn} onClick={()=>{if(confirm("Silmek istediğinize emin misiniz?"))deleteListing(l.id)}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {view === "form" && isAdmin && (
        <div>
          <nav style={{...S.nav,background:"#1e1a17"}}>
            <div style={S.logo}>Furkan Ünal <span style={S.logoSpan}>GYD</span></div>
            <button style={S.btnSm} onClick={()=>{setView("admin");setForm(EMPTY_FORM);setEditId(null)}}>← Admin Panel</button>
          </nav>
          <div style={{maxWidth:780,margin:"0 auto",padding:"40px 24px 80px"}}>
            <h2 style={{fontFamily:"Playfair Display,serif",fontSize:"1.7rem",color:"#2d2925",marginBottom:8}}>
              {editId?"İlanı Düzenle":"Yeni İlan Ekle"}
            </h2>
            <p style={{color:"#999",fontSize:"0.85rem",marginBottom:32}}>* ile işaretli alanlar zorunludur.</p>

            <div style={S.formSection}>
              <div style={S.formSectionTitle}>📌 Temel Bilgiler</div>
              <div style={S.formGrid2}>
                <div style={S.formGroup}>
                  <label style={S.label}>İlan Başlığı *</label>
                  <input style={S.input} placeholder="örn. Deniz Manzaralı 3+1 Daire"
                    value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Konum *</label>
                  <input style={S.input} placeholder="örn. Kadıköy, İstanbul"
                    value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/>
                </div>
              </div>
              <div style={S.formGrid3}>
                <div style={S.formGroup}>
                  <label style={S.label}>Fiyat (₺) *</label>
                  <input style={S.input} type="number" placeholder="4850000"
                    value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>İlan Türü</label>
                  <select style={S.input} value={form.priceType} onChange={e=>setForm(f=>({...f,priceType:e.target.value}))}>
                    <option>Satılık</option><option>Kiralık</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Oda Sayısı</label>
                  <select style={S.input} value={form.rooms} onChange={e=>setForm(f=>({...f,rooms:e.target.value}))}>
                    {ROOM_OPTIONS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.formSectionTitle}>🏗️ Detaylar</div>
              <div style={S.formGrid3}>
                {[
                  ["Alan (m²)","number","120","area"],
                  ["Bulunduğu Kat","number","3","floor"],
                  ["Toplam Kat","number","8","totalFloor"],
                  ["Isıtma","text","Kombi / Merkezi","heating"],
                  ["Bina Yaşı","text","5 yıl","age"],
                  ["Aidat (₺/ay)","number","500","dues"],
                ].map(([lbl,type,ph,key])=>(
                  <div key={key} style={S.formGroup}>
                    <label style={S.label}>{lbl}</label>
                    <input style={S.input} type={type} placeholder={ph}
                      value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.formSectionTitle}>✅ Özellikler</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {FEATURE_OPTIONS.map(feat=>{
                  const on=form.features.includes(feat);
                  return (
                    <button key={feat} style={{...S.featBtn,...(on?S.featBtnOn:{})}}
                      onClick={()=>setForm(f=>({...f,features:on?f.features.filter(x=>x!==feat):[...f.features,feat]}))}>
                      {on?"✓ ":""}{feat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.formSectionTitle}>📝 Açıklama</div>
              <textarea style={{...S.input,minHeight:110,resize:"vertical"}}
                placeholder="İlan hakkında detaylı bilgi girin…"
                value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            </div>

            <div style={S.formSection}>
              <div style={S.formSectionTitle}>📷 Fotoğraflar</div>
              <label style={S.uploadBtn}>
                + Fotoğraf Ekle
                <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImages}/>
              </label>
              {form.images.length>0 && (
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:16}}>
                  {form.images.map((img,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      <img src={img} style={{width:100,height:80,objectFit:"cover",borderRadius:8,border:"2px solid #e8ddd0"}} alt=""/>
                      <button onClick={()=>setForm(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))}
                        style={{position:"absolute",top:-6,right:-6,background:"#e05050",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:"0.7rem"}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:12,marginTop:8}}>
              <button style={{...S.btnPrimary,flex:1,opacity:saving?0.7:1}} onClick={submitListing} disabled={saving}>
                {saving?"⏳ Kaydediliyor…":editId?"💾 Güncelle":"✅ İlanı Yayınla"}
              </button>
              <button style={S.btnGhost} onClick={()=>{setView("admin");setForm(EMPTY_FORM);setEditId(null)}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL ── */}
      {view === "detail" && detail && (
        <div>
          <nav style={S.nav}>
            <div style={S.logo}>Furkan Ünal <span style={S.logoSpan}>GYD</span></div>
            <button style={S.btnSm} onClick={()=>setView(detailFrom)}>← Geri</button>
          </nav>
          <div style={{maxWidth:960,margin:"0 auto",padding:"36px 24px 80px"}}>

            <div style={{borderRadius:16,overflow:"hidden",marginBottom:16,background:"#e8ddd0",position:"relative"}}>
              {detail.images?.length>0 ? (
                <>
                  <img src={detail.images[imgIdx]}
                    style={{width:"100%",height:420,objectFit:"cover",display:"block",cursor:"zoom-in"}}
                    alt="" onClick={()=>setLightbox(true)}/>
                  {detail.images.length>1 && (
                    <>
                      <div style={{display:"flex",gap:8,padding:"10px",background:"rgba(0,0,0,0.3)",position:"absolute",bottom:0,left:0,right:0,justifyContent:"center"}}>
                        {detail.images.map((_,i)=>(
                          <div key={i} onClick={()=>setImgIdx(i)}
                            style={{width:i===imgIdx?28:9,height:9,borderRadius:9,background:i===imgIdx?"#b5936a":"rgba(255,255,255,0.5)",cursor:"pointer",transition:"all 0.2s"}}/>
                        ))}
                      </div>
                      <button onClick={()=>setImgIdx(i=>(i-1+detail.images.length)%detail.images.length)} style={S.galleryArrow("left")}>‹</button>
                      <button onClick={()=>setImgIdx(i=>(i+1)%detail.images.length)} style={S.galleryArrow("right")}>›</button>
                    </>
                  )}
                  <span style={{position:"absolute",bottom:detail.images.length>1?46:10,right:14,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:"0.72rem",padding:"4px 10px",borderRadius:10,pointerEvents:"none"}}>🔍 Büyütmek için tıkla</span>
                </>
              ) : (
                <div style={{height:280,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"4rem"}}>🏠</div>
              )}
              <span style={{...S.badge,top:16,left:16,background:detail.priceType==="Kiralık"?"#3d8a5e":"#b5936a",fontSize:"0.8rem"}}>{detail.priceType}</span>
            </div>

            {detail.images?.length>1 && (
              <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
                {detail.images.map((img,i)=>(
                  <img key={i} src={img} onClick={()=>setImgIdx(i)}
                    style={{width:72,height:56,objectFit:"cover",borderRadius:8,cursor:"pointer",border:i===imgIdx?"2.5px solid #b5936a":"2px solid transparent",opacity:i===imgIdx?1:0.65,transition:"all 0.15s"}} alt=""/>
                ))}
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:28,alignItems:"start"}} className="detail-grid">
              <div>
                <h1 style={{fontFamily:"Playfair Display,serif",fontSize:"1.9rem",color:"#2d2925",marginBottom:6}}>{detail.title}</h1>
                <div style={{color:"#888",fontSize:"0.9rem",marginBottom:22}}>📍 {detail.location}</div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}} className="spec-grid">
                  {[
                    ["🛏 Oda Sayısı",detail.rooms],
                    ["📐 Kullanım Alanı",detail.area?detail.area+" m²":null],
                    ["🏢 Kat",detail.floor&&detail.totalFloor?`${detail.floor}/${detail.totalFloor}`:detail.floor?detail.floor+". Kat":null],
                    ["🔥 Isıtma",detail.heating],
                    ["🏗 Bina Yaşı",detail.age],
                    ["💰 Aidat",detail.dues?"₺"+Number(detail.dues).toLocaleString("tr-TR")+"/ay":null],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{background:"#f7f3ee",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:"0.7rem",color:"#b5936a",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{k}</div>
                      <div style={{fontWeight:600,color:"#2d2925",fontSize:"0.93rem"}}>{v}</div>
                    </div>
                  ))}
                </div>

                {detail.description && (
                  <div style={{marginBottom:24}}>
                    <div style={{fontFamily:"Playfair Display,serif",fontSize:"1.1rem",marginBottom:10,color:"#2d2925"}}>Açıklama</div>
                    <p style={{color:"#555",lineHeight:1.8,fontSize:"0.92rem",whiteSpace:"pre-wrap"}}>{detail.description}</p>
                  </div>
                )}

                {detail.features?.length>0 && (
                  <div>
                    <div style={{fontFamily:"Playfair Display,serif",fontSize:"1.1rem",marginBottom:12,color:"#2d2925"}}>Özellikler</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {detail.features.map(f=>(
                        <span key={f} style={{background:"#f0ebe4",color:"#7a5c42",padding:"6px 14px",borderRadius:20,fontSize:"0.82rem",fontWeight:500}}>✓ {f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{background:"#fff",borderRadius:16,padding:24,boxShadow:"0 4px 24px rgba(45,41,37,0.09)",position:"sticky",top:90}}>
                <div style={{fontFamily:"Playfair Display,serif",fontSize:"2.1rem",color:"#7a5c42",fontWeight:700,marginBottom:4}}>
                  ₺{Number(detail.price).toLocaleString("tr-TR")}
                  {detail.priceType==="Kiralık"&&<span style={{fontSize:"1rem",color:"#999"}}> / ay</span>}
                </div>
                <div style={{color:"#aaa",fontSize:"0.82rem",marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f0ebe4"}}>{detail.priceType}</div>
                <div style={{background:"#f7f3ee",borderRadius:12,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:"#b5936a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>👤</div>
                  <div>
                    <div style={{fontWeight:600,color:"#2d2925",fontSize:"0.95rem"}}>Furkan Ünal</div>
                    <div style={{color:"#b5936a",fontSize:"0.78rem",marginTop:1}}>Gayrimenkul Değerleme Danışmanı</div>
                  </div>
                </div>
                <a href="tel:+905055790920"
                  style={{display:"block",background:"#b5936a",color:"#fff",textDecoration:"none",textAlign:"center",padding:"13px",borderRadius:10,fontWeight:600,fontSize:"0.92rem",marginBottom:10}}>
                  📞 0505 579 09 20
                </a>
                <a href={`https://wa.me/905055790920?text=${encodeURIComponent("Merhaba, şu ilan hakkında bilgi almak istiyorum: "+detail.title)}`}
                  target="_blank"
                  style={{display:"block",background:"#25d366",color:"#fff",textDecoration:"none",textAlign:"center",padding:"13px",borderRadius:10,fontWeight:600,fontSize:"0.92rem"}}>
                  💬 WhatsApp'tan Yaz
                </a>
                {isAdmin && (
                  <button style={{...S.editBtn,width:"100%",marginTop:12,justifyContent:"center"}} onClick={()=>editListing(detail)}>
                    ✏️ İlanı Düzenle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f7f3ee; }
  .card { cursor: pointer; transition: transform 0.22s, box-shadow 0.22s; animation: fadeUp 0.5s ease both; }
  .card:hover { transform: translateY(-5px); box-shadow: 0 14px 38px rgba(45,41,37,0.13) !important; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  input, select, textarea { outline: none; }
  input:focus, select:focus, textarea:focus { border-color: #b5936a !important; }
  a { transition: opacity 0.2s; } a:hover { opacity: 0.85; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #d4c5b0; border-radius: 3px; }
  @media(max-width:720px) {
    .detail-grid { grid-template-columns: 1fr !important; }
    .spec-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
`;

const S = {
  root: { minHeight:"100vh", background:"#f7f3ee", fontFamily:"'DM Sans',sans-serif" },
  toast: { position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#2d2925", color:"#f7f3ee", padding:"12px 26px", borderRadius:30, zIndex:9999, fontSize:"0.88rem", boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap" },
  nav: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 36px", background:"#2d2925", position:"sticky", top:0, zIndex:100 },
  logo: { fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"#f7f3ee", letterSpacing:"0.03em" },
  logoSpan: { color:"#b5936a" },
  navBtn: { background:"transparent", border:"1px solid rgba(181,147,106,0.5)", color:"#f7f3ee", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:"0.82rem" },
  btnSm: { background:"rgba(181,147,106,0.2)", border:"none", color:"#f7f3ee", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:"0.82rem" },
  hero: { background:"linear-gradient(135deg,#2d2925 0%,#4a3c30 100%)", padding:"80px 24px 70px", textAlign:"center", position:"relative", overflow:"hidden" },
  heroOverlay: { position:"absolute", inset:0, background:"radial-gradient(ellipse at 70% 50%,rgba(181,147,106,0.2) 0%,transparent 65%)" },
  heroTag: { display:"inline-block", background:"rgba(181,147,106,0.2)", color:"#b5936a", border:"1px solid rgba(181,147,106,0.35)", padding:"5px 16px", borderRadius:20, fontSize:"0.78rem", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:20 },
  heroH1: { fontFamily:"'Playfair Display',serif", fontSize:"clamp(2rem,5vw,3.4rem)", color:"#f7f3ee", lineHeight:1.25, marginBottom:16 },
  heroP: { color:"#e8ddd0", fontSize:"0.95rem", maxWidth:460, margin:"0 auto 32px", lineHeight:1.7, fontWeight:300 },
  searchBar: { display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", maxWidth:680, margin:"0 auto" },
  searchInput: { padding:"12px 16px", borderRadius:8, border:"1px solid rgba(181,147,106,0.3)", background:"rgba(247,243,238,0.1)", color:"#f7f3ee", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", flex:"1 1 180px", minWidth:150 },
  searchSelect: { padding:"12px 14px", borderRadius:8, border:"1px solid rgba(181,147,106,0.3)", background:"rgba(247,243,238,0.1)", color:"#f7f3ee", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", flex:"1 1 140px", minWidth:120 },
  section: { maxWidth:1100, margin:"0 auto", padding:"52px 24px 64px" },
  secHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 },
  secH2: { fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#2d2925" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:24 },
  card: { background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 3px 16px rgba(45,41,37,0.07)" },
  cardImgWrap: { position:"relative" },
  cardImg: { width:"100%", height:200, objectFit:"cover", display:"block" },
  imgPlaceholder: { background:"#e8ddd0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem" },
  badge: { position:"absolute", top:12, left:12, color:"#fff", fontSize:"0.72rem", letterSpacing:"0.07em", textTransform:"uppercase", padding:"5px 12px", borderRadius:20, fontWeight:500 },
  imgCount: { position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,0.55)", color:"#fff", fontSize:"0.75rem", padding:"4px 10px", borderRadius:12 },
  cardBody: { padding:"18px 20px 20px" },
  cardPrice: { fontFamily:"'Playfair Display',serif", fontSize:"1.35rem", color:"#7a5c42", fontWeight:700, marginBottom:5 },
  cardTitle: { fontSize:"0.93rem", fontWeight:500, color:"#2d2925", marginBottom:4 },
  cardLoc: { fontSize:"0.8rem", color:"#999", marginBottom:14 },
  cardMeta: { display:"flex", gap:14, paddingTop:12, borderTop:"1px solid #f0ebe4", flexWrap:"wrap" },
  metaItem: { fontSize:"0.8rem", color:"#888" },
  empty: { textAlign:"center", padding:"70px 20px" },
  loginWrap: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#2d2925,#4a3c30)", padding:20 },
  loginBox: { background:"#fff", borderRadius:18, padding:"40px 36px", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  formSection: { background:"#fff", borderRadius:14, padding:24, marginBottom:16, boxShadow:"0 2px 12px rgba(45,41,37,0.06)" },
  formSectionTitle: { fontFamily:"'Playfair Display',serif", fontSize:"1rem", color:"#2d2925", marginBottom:16, paddingBottom:10, borderBottom:"1px solid #f0ebe4" },
  formGrid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 },
  formGrid3: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 },
  formGroup: { display:"flex", flexDirection:"column", gap:6, marginBottom:4 },
  label: { fontSize:"0.78rem", color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500 },
  input: { padding:"11px 14px", borderRadius:8, border:"1.5px solid #e8ddd0", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", color:"#2d2925", background:"#faf8f5", transition:"border-color 0.2s", width:"100%" },
  errMsg: { background:"#fef2f2", color:"#e05050", padding:"10px 14px", borderRadius:8, fontSize:"0.83rem", marginBottom:12, border:"1px solid #fca5a5" },
  btnPrimary: { width:"100%", background:"#b5936a", color:"#fff", border:"none", padding:"13px 24px", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:500, cursor:"pointer" },
  btnGhost: { width:"100%", background:"transparent", color:"#888", border:"1px solid #e8ddd0", padding:"12px 24px", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", cursor:"pointer", marginTop:8 },
  editBtn: { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#f0ebe4", color:"#7a5c42", border:"none", borderRadius:8, cursor:"pointer", fontSize:"0.83rem", fontWeight:500 },
  delBtn: { padding:"8px 12px", background:"#fef2f2", color:"#e05050", border:"none", borderRadius:8, cursor:"pointer", fontSize:"0.85rem" },
  featBtn: { padding:"7px 14px", borderRadius:20, border:"1.5px solid #e8ddd0", background:"#faf8f5", color:"#888", fontSize:"0.82rem", cursor:"pointer", transition:"all 0.15s" },
  featBtnOn: { border:"1.5px solid #b5936a", background:"rgba(181,147,106,0.12)", color:"#7a5c42", fontWeight:600 },
  uploadBtn: { display:"inline-block", padding:"10px 20px", background:"#f0ebe4", color:"#7a5c42", borderRadius:10, cursor:"pointer", fontSize:"0.85rem", fontWeight:500, border:"1.5px dashed #b5936a" },
  adminRow: { background:"#fff", borderRadius:14, padding:16, display:"flex", gap:16, alignItems:"center", boxShadow:"0 2px 12px rgba(45,41,37,0.06)" },
  adminThumb: { width:80, height:70, flexShrink:0, cursor:"pointer", borderRadius:10, overflow:"hidden" },
  pill: { background:"#f0ebe4", color:"#7a5c42", padding:"3px 10px", borderRadius:12, fontSize:"0.75rem", fontWeight:500 },
  galleryArrow: (side) => ({ position:"absolute", top:"50%", [side]:12, transform:"translateY(-50%)", background:"rgba(0,0,0,0.5)", color:"#fff", border:"none", borderRadius:"50%", width:40, height:40, fontSize:"1.5rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }),
  lbOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.93)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" },
  lbImg: { maxWidth:"90vw", maxHeight:"88vh", objectFit:"contain", borderRadius:8, boxShadow:"0 8px 60px rgba(0,0,0,0.6)", cursor:"default" },
  lbClose: { position:"fixed", top:18, right:22, background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", fontSize:"1.3rem", width:40, height:40, borderRadius:"50%", cursor:"pointer", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center" },
  lbArrow: { position:"fixed", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", fontSize:"2.2rem", width:50, height:50, borderRadius:"50%", cursor:"pointer", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center" },
  lbDots: { position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:8, alignItems:"center" },
  lbCounter: { position:"fixed", top:22, left:"50%", transform:"translateX(-50%)", color:"rgba(255,255,255,0.6)", fontSize:"0.82rem", letterSpacing:"0.06em" },
  footer: { background:"#1e1a17", color:"#e8ddd0", padding:"40px 36px", textAlign:"center", marginTop:40 },
};
