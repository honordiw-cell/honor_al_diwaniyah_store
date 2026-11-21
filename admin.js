(() => {
"use strict";
const CONFIG=window.STORE_CONFIG||{};
const BUCKET="product-images";
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STATUS={new:"جديد",confirmed:"تم التأكيد",processing:"قيد التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
const PAYMENT={pending:"بانتظار الدفع",paid:"مدفوع",failed:"فشل الدفع"};
let db=null,user=null,profile=null,categories=[],products=[],orders=[],editingImages=[],newFiles=[],previewUrls=[];
const productFields=["name","category_id","brand","price","old_price","stock","ram","storage","color","chipset","screen","camera","battery","protection","description"];
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2800)}
function setError(id,msg){$(id).textContent=msg||""}
function cleanupPreviews(){previewUrls.forEach(URL.revokeObjectURL);previewUrls=[]}
function showLogin(error=""){ $("login-screen").classList.remove("hidden");$("app").classList.add("hidden");setError("login-error",error)}
function showApp(){ $("login-screen").classList.add("hidden");$("app").classList.remove("hidden");$("user-name").textContent=profile.full_name||user.email||"الإدارة";$("user-role").textContent=profile.role==="owner"?"مالك المتجر":"موظف الإدارة"; }
async function checkAccess(){
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){showLogin();return false}
 const {data:u,error:ue}=await db.auth.getUser();
 if(ue||!u.user){await db.auth.signOut();showLogin("تعذر التحقق من الحساب. سجّل الدخول مرة ثانية.");return false}
 user=u.user;
 const {data:p,error:pe}=await db.from("profiles").select("id,full_name,role,is_active").eq("id",user.id).maybeSingle();
 if(pe||!p||!p.is_active||!["owner","admin","staff"].includes(p.role)){
   await db.auth.signOut();showLogin("هذا الحساب غير مخوّل لإدارة المتجر.");return false;
 }
 profile=p;showApp();return true;
}
async function loadAll(){
 try{
  const [c,p,o]=await Promise.all([
   db.from("categories").select("id,name,slug,is_active").order("name"),
   db.from("products").select("id,category_id,name,description,price,old_price,stock,image_url,images,brand,is_active,created_at,updated_at,sku,ram,storage,color,is_featured,chipset,screen,camera,battery,protection").order("created_at",{ascending:false}),
   db.from("orders").select("id,order_number,customer_name,phone,province,city,district,address,notes,payment_method,payment_status,status,order_status,total,subtotal,delivery_fee,created_at,updated_at,order_items(id,product_name,quantity,unit_price,line_total)").order("created_at",{ascending:false}).limit(200)
  ]);
  if(c.error)throw c.error;if(p.error)throw p.error;if(o.error)throw o.error;
  categories=c.data||[];products=p.data||[];orders=o.data||[];
  renderAll();
 }catch(e){console.error(e);toast("تعذر تحميل البيانات: "+(e.message||"خطأ غير معروف"))}
}
function renderAll(){renderStats();renderProducts();renderOrders();renderCategories();renderCategoryOptions()}
function renderStats(){
 const active=products.filter(p=>p.is_active).length,pending=orders.filter(o=>["new","confirmed","processing"].includes(o.status)).length,sales=orders.filter(o=>o.status==="delivered").reduce((n,o)=>n+Number(o.total||0),0);
 $("stat-products").textContent=active;$("stat-orders").textContent=orders.length;$("stat-pending").textContent=pending;$("stat-sales").textContent=money(sales);
 $("nav-products-count").textContent=products.length;$("nav-orders-count").textContent=pending;
 const recent=orders.slice(0,6);
 $("recent-orders").innerHTML=recent.length?tableOrders(recent,true):'<div class="empty-row">ماكو طلبات لحد الآن.</div>';
}
function renderCategoryOptions(selected=""){
 const opts=categories.map(c=>'<option value="'+esc(c.id)+'" '+(String(c.id)===String(selected)?"selected":"")+'>'+esc(c.name)+'</option>').join("");
 $("form-category").innerHTML='<option value="">اختر القسم</option>'+opts;
 const filter=$("product-category-filter"),prev=filter.value;
 filter.innerHTML='<option value="">كل الأقسام</option>'+opts;
 filter.value=categories.some(c=>String(c.id)===String(prev))?prev:"";
}
function renderProducts(){
 const q=$("product-search").value.trim().toLowerCase(),cat=$("product-category-filter").value,state=$("product-state-filter").value;
 const rows=products.filter(p=>(!cat||String(p.category_id)===cat)&&(state===""||String(p.is_active)===state)&&(!q||[p.name,p.brand,p.sku].join(" ").toLowerCase().includes(q)));
 $("products-table").innerHTML=rows.length?'<table><thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>المخزون</th><th>الظهور</th><th>إجراءات</th></tr></thead><tbody>'+rows.map(p=>{
 const catName=categories.find(c=>c.id===p.category_id)?.name||"غير مصنف",img=p.image_url||p.images?.[0];
 return '<tr><td><div class="product-cell">'+(img?'<img src="'+esc(img)+'" alt="">':'<span class="product-thumb"></span>')+'<div><b>'+esc(p.name)+'</b><small>'+esc(p.brand||catName)+'</small></div></div></td><td>'+esc(catName)+'</td><td>'+money(p.price)+(p.old_price>p.price?'<small class="muted"> <del>'+money(p.old_price)+'</del></small>':'')+'</td><td>'+Number(p.stock||0)+'</td><td><span class="badge '+(p.is_active?"good":"off")+'">'+(p.is_active?"منشور":"مخفي")+'</span></td><td><button class="action-btn" data-edit="'+p.id+'">تعديل</button><button class="action-btn '+(p.is_active?"danger":"")+'" data-toggle="'+p.id+'">'+(p.is_active?"إخفاء":"نشر")+'</button></td></tr>';
 }).join("")+'</tbody></table>':'<div class="empty-row">ماكو منتجات تطابق البحث.</div>';
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));
 document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggleProduct(b.dataset.toggle));
}
function tableOrders(rows,compact=false){
 return '<table><thead><tr><th>رقم الطلب</th><th>الزبون</th><th>الهاتف</th><th>المجموع</th><th>الحالة</th>'+(compact?"":"<th>الدفع</th><th>التاريخ</th>")+'<th>الإجراءات</th></tr></thead><tbody>'+rows.map(o=>'<tr><td>#'+esc(o.order_number??o.id.slice(0,8))+'</td><td>'+esc(o.customer_name)+'</td><td>'+esc(o.phone)+'</td><td>'+money(o.total)+'</td><td><select class="inline-select" data-order-status="'+o.id+'">'+Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'" '+(o.status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></td>'+(compact?"":'<td><select class="inline-select" data-payment-status="'+o.id+'">'+Object.entries(PAYMENT).map(([k,v])=>'<option value="'+k+'" '+(o.payment_status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></td><td>'+new Date(o.created_at).toLocaleDateString("ar-IQ")+'</td>')+'<td><button class="action-btn" data-order-detail="'+o.id+'">عرض</button>'+(compact?"":'<button class="action-btn danger" data-order-delete="'+o.id+'">حذف</button>')+'</td></tr>').join("")+'</tbody></table>';
}
function renderOrders(){
 const q=$("order-search").value.trim().toLowerCase(),st=$("order-status-filter").value;
 const rows=orders.filter(o=>(!st||o.status===st)&&(!q||[o.order_number,o.customer_name,o.phone,o.province,o.district].join(" ").toLowerCase().includes(q)));
 $("orders-table").innerHTML=rows.length?tableOrders(rows):'<div class="empty-row">ماكو طلبات مطابقة.</div>';
 bindOrderActions();
}
function bindOrderActions(){
 document.querySelectorAll("[data-order-status]").forEach(s=>s.onchange=()=>updateOrder(s.dataset.orderStatus,{status:s.value,order_status:s.value}));
 document.querySelectorAll("[data-payment-status]").forEach(s=>s.onchange=()=>updateOrder(s.dataset.paymentStatus,{payment_status:s.value}));
 document.querySelectorAll("[data-order-detail]").forEach(b=>b.onclick=()=>showOrder(b.dataset.orderDetail));
 document.querySelectorAll("[data-order-delete]").forEach(b=>b.onclick=()=>deleteOrder(b.dataset.orderDelete));
}
async function updateOrder(id,patch){
 try{const {error}=await db.from("orders").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;const o=orders.find(x=>x.id===id);Object.assign(o,patch);renderStats();renderOrders();toast("تم تحديث الطلب بنجاح")}
 catch(e){toast("تعذر تحديث الطلب: "+e.message);loadAll()}
}
async function deleteOrder(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 const label="#"+(o.order_number??id.slice(0,8));
 if(!window.confirm("تأكيد حذف الطلب "+label+" للزبون "+(o.customer_name||"—")+"؟\\nسيتم حذف تفاصيل الطلب المرتبطة به أيضاً، ولا يمكن التراجع عن هذه العملية."))return;
 try{
  const {error}=await db.from("orders").delete().eq("id",id);
  if(error)throw error;
  orders=orders.filter(x=>x.id!==id);
  renderAll();toast("تم حذف الطلب "+label+" بنجاح");
  if($("order-dialog").open)$("order-dialog").close();
 }catch(e){console.error(e);toast("تعذر حذف الطلب: "+(e.message||"حدث خطأ"));}
}
function showOrder(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 const fields=[["رقم الطلب","#"+(o.order_number??"")],["الزبون",o.customer_name],["الهاتف",o.phone],["المحافظة",o.province],["المنطقة",o.district||o.city||"—"],["العنوان",o.address],["طريقة الدفع",o.payment_method==="cod"?"عند الاستلام":o.payment_method],["حالة الدفع",PAYMENT[o.payment_status]||o.payment_status],["المجموع",money(o.total)],["ملاحظات",o.notes||"—"]];
 $("order-details").innerHTML='<div class="order-detail-grid">'+fields.map(x=>'<div class="detail-box"><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></div>').join("")+'</div><table class="order-items"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>'+(o.order_items||[]).map(i=>'<tr><td>'+esc(i.product_name)+'</td><td>'+i.quantity+'</td><td>'+money(i.unit_price)+'</td><td>'+money(i.line_total)+'</td></tr>').join("")+'</tbody></table>';
 $("order-dialog").showModal();
}
function renderCategories(){
 $("categories-grid").innerHTML=categories.map(c=>'<article class="category-card"><div><b>'+esc(c.name)+'</b><small>'+esc(c.slug)+'</small></div><label class="check-field"><input class="switch" type="checkbox" data-category-toggle="'+c.id+'" '+(c.is_active?"checked":"")+'> '+(c.is_active?"ظاهر":"مخفي")+'</label></article>').join("");
 document.querySelectorAll("[data-category-toggle]").forEach(ch=>ch.onchange=async()=>{try{const {error}=await db.from("categories").update({is_active:ch.checked}).eq("id",ch.dataset.categoryToggle);if(error)throw error;const c=categories.find(x=>x.id===ch.dataset.categoryToggle);c.is_active=ch.checked;toast("تم تحديث القسم")}catch(e){ch.checked=!ch.checked;toast("تعذر تحديث القسم: "+e.message)}});
}
function openProduct(id=""){
 const p=products.find(x=>x.id===id);
 $("product-form").reset();setError("product-form-error","");cleanupPreviews();newFiles=[];
 $("product-dialog-title").textContent=p?"تعديل المنتج":"إضافة منتج جديد";
 const form=$("product-form");form.elements.id.value=p?.id||"";
 productFields.forEach(k=>{if(form.elements[k])form.elements[k].value=p?.[k]??(k==="stock"?1:"")});
 form.elements.is_featured.checked=!!p?.is_featured;form.elements.is_active.checked=p?p.is_active:true;
 editingImages=[...(p?.images||[])];if(p?.image_url&&!editingImages.includes(p.image_url))editingImages.unshift(p.image_url);
 renderImagePreview();$("product-images").value="";renderCategoryOptions(p?.category_id||"");
 $("product-dialog").showModal();
}
function renderImagePreview(){
 const old=editingImages.map((url,i)=>'<div class="preview-item"><img src="'+esc(url)+'" alt=""><button type="button" data-remove-old="'+i+'">×</button></div>');
 const fresh=newFiles.map((f,i)=>{const url=URL.createObjectURL(f);previewUrls.push(url);return '<div class="preview-item"><img src="'+url+'" alt=""><button type="button" data-remove-new="'+i+'">×</button></div>'});
 $("image-preview").innerHTML=old.concat(fresh).join("")||'<small class="muted">لم تتم إضافة صور بعد.</small>';
 document.querySelectorAll("[data-remove-old]").forEach(b=>b.onclick=()=>{editingImages.splice(Number(b.dataset.removeOld),1);renderImagePreview()});
 document.querySelectorAll("[data-remove-new]").forEach(b=>b.onclick=()=>{newFiles.splice(Number(b.dataset.removeNew),1);renderImagePreview()});
}
async function uploadImages(){
 const uploaded=[];
 for(const file of newFiles){
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path="products/"+crypto.randomUUID()+"."+ext;
  const {error}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:"31536000",contentType:file.type,upsert:false});
  if(error)throw error;
  const {data}=db.storage.from(BUCKET).getPublicUrl(path);
  uploaded.push(data.publicUrl);
 }
 return uploaded;
}
async function saveProduct(e){
 e.preventDefault();const form=e.currentTarget,btn=$("save-product-btn");setError("product-form-error","");
 const files=[...newFiles];if(files.some(f=>!/^image\/(jpeg|png|webp|avif)$/.test(f.type)||f.size>8*1024*1024)){setError("product-form-error","تأكد أن الصور JPG أو PNG أو WEBP أو AVIF وحجم كل صورة أقل من 8MB.");return}
 btn.disabled=true;btn.textContent="جاري الحفظ...";
 try{
  const fd=new FormData(form),payload={};
  productFields.forEach(k=>{if(k==="price"||k==="old_price"||k==="stock")payload[k]=fd.get(k)===""?null:Number(fd.get(k));else payload[k]=String(fd.get(k)||"").trim()||null});
  payload.is_featured=form.elements.is_featured.checked;payload.is_active=form.elements.is_active.checked;
  const fresh=await uploadImages(),allImages=[...editingImages,...fresh];
  payload.images=allImages;payload.image_url=allImages[0]||null;payload.updated_at=new Date().toISOString();
  const id=form.elements.id.value;
  const result=id?await db.from("products").update(payload).eq("id",id).select().single():await db.from("products").insert(payload).select().single();
  if(result.error)throw result.error;
  $("product-dialog").close();cleanupPreviews();newFiles=[];toast(id?"تم تحديث المنتج":"تمت إضافة المنتج بنجاح");await loadAll();
 }catch(err){console.error(err);setError("product-form-error","تعذر الحفظ: "+(err.message||"حدث خطأ أثناء العملية"))}
 finally{btn.disabled=false;btn.textContent="حفظ المنتج"}
}
async function toggleProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 try{const {error}=await db.from("products").update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;p.is_active=!p.is_active;renderAll();toast(p.is_active?"تم نشر المنتج":"تم إخفاء المنتج")}
 catch(e){toast("تعذر تحديث المنتج: "+e.message)}
}
function go(view){
 document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
 document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 const titles={overview:"نظرة عامة",products:"إدارة المنتجات",orders:"إدارة الطلبات",categories:"أقسام المتجر"};
 $("page-title").textContent=titles[view]||"لوحة الإدارة";$("app").classList.remove("menu-open");
}
function bind(){
 $("login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=e.currentTarget.querySelector("button");b.disabled=true;b.textContent="جاري التحقق...";const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});b.disabled=false;b.textContent="دخول إلى لوحة الإدارة";if(error){setError("login-error","بيانات الدخول غير صحيحة أو تعذر الاتصال.");return}if(await checkAccess())await loadAll()};
 $("logout-btn").onclick=async()=>{await db.auth.signOut();location.reload()};
 document.querySelectorAll(".nav-link").forEach(b=>b.onclick=()=>go(b.dataset.view));
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 document.querySelectorAll("[data-open-product]").forEach(b=>b.onclick=()=>openProduct());
 document.querySelectorAll("[data-close-dialog]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
 $("product-form").onsubmit=saveProduct;
 $("product-images").onchange=e=>{const selected=[...e.target.files];newFiles.push(...selected);cleanupPreviews();renderImagePreview();e.target.value=""};
 ["product-search","product-category-filter","product-state-filter"].forEach(id=>$(id).addEventListener(id==="product-search"?"input":"change",renderProducts));
 ["order-search","order-status-filter"].forEach(id=>$(id).addEventListener(id==="order-search"?"input":"change",renderOrders));
 $("refresh-orders").onclick=loadAll;$("menu-toggle").onclick=()=>$("app").classList.toggle("menu-open");
}
async function init(){
 if(!CONFIG.supabaseUrl||!CONFIG.supabaseAnonKey||!window.supabase){showLogin("إعداد الاتصال بقاعدة البيانات غير مكتمل.");return}
 db=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey);
 bind();
 if(await checkAccess())await loadAll();
 db.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){showLogin()}});
}
document.addEventListener("DOMContentLoaded",init);
})();