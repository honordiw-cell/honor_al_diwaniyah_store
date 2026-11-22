(() => {
"use strict";
const CONFIG=window.STORE_CONFIG||{};
const BUCKET="product-images";
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STATUS={new:"جديد",confirmed:"تم التأكيد",processing:"قيد التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
const PAYMENT={pending:"بانتظار الدفع",paid:"مدفوع",failed:"فشل الدفع"};
let db=null,user=null,profile=null,categories=[],products=[],orders=[],stockMovements=[],orderEvents=[],dashboardMetrics={},banners=[],productReviews=[],deliveryRatesAdmin=[],editingImages=[],newFiles=[],previewUrls=[],bannerFile=null,bannerPreviewUrl="";
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
  const [c,p,o,m,s,h,b,r,v]=await Promise.all([
   db.from("categories").select("id,name,slug,is_active").order("name"),
   db.from("products").select("id,category_id,name,description,price,old_price,stock,image_url,images,brand,is_active,created_at,updated_at,sku,ram,storage,color,is_featured,chipset,screen,camera,battery,protection").order("created_at",{ascending:false}),
   db.from("orders").select("id,order_number,customer_name,phone,province,city,district,address,notes,payment_method,payment_status,status,order_status,total,subtotal,delivery_fee,created_at,updated_at,order_items(id,product_name,quantity,unit_price,line_total)").order("created_at",{ascending:false}).limit(1000),
   db.rpc("admin_dashboard_metrics"),
   db.from("stock_movements").select("id,product_id,product_name,old_stock,new_stock,quantity_delta,reason,created_at").order("created_at",{ascending:false}).limit(50),
   db.from("order_status_history").select("id,order_id,order_number,event_type,from_status,to_status,details,created_at").order("created_at",{ascending:false}).limit(50),
   db.from("home_banners").select("*").order("updated_at",{ascending:false}),
   db.from("product_reviews").select("id,product_id,order_id,customer_name,rating,review_text,is_approved,created_at,products(name)").order("created_at",{ascending:false}).limit(200),
   db.from("delivery_rates").select("governorate,fee,is_active").order("governorate")
  ]);
  if(c.error)throw c.error;if(p.error)throw p.error;if(o.error)throw o.error;
  if(m.error)console.warn("Dashboard metrics unavailable:",m.error);
  if(s.error)console.warn("Stock movement history unavailable:",s.error);
  if(h.error)console.warn("Order audit history unavailable:",h.error);
  if(r.error)console.warn("Product reviews unavailable:",r.error);
  if(v.error)console.warn("Delivery rates unavailable:",v.error);
  categories=c.data||[];products=p.data||[];orders=o.data||[];dashboardMetrics=m.data||{};stockMovements=s.data||[];orderEvents=h.data||[];banners=b.data||[];productReviews=r.data||[];deliveryRatesAdmin=v.data||[];
  renderAll();
   renderBanners();renderDeliveryRates();renderReviewModeration();
 }catch(e){console.error(e);toast("تعذر تحميل البيانات: "+(e.message||"خطأ غير معروف"))}
}
function renderAll(){renderStats();renderProducts();renderOrders();renderCategories();renderCategoryOptions();renderStockMovements();renderOrderAudit()}
function renderStats(){
 const active=products.filter(p=>p.is_active).length,pending=Number(dashboardMetrics.pending_orders??orders.filter(o=>["new","confirmed","processing"].includes(o.status)).length),sales=Number(dashboardMetrics.delivered_sales??0);
 $("stat-products").textContent=active;$("stat-orders").textContent=Number(dashboardMetrics.total_orders??orders.length);$("stat-pending").textContent=pending;$("stat-sales").textContent=money(sales);
 $("stat-month-sales").textContent=money(dashboardMetrics.month_sales||0);$("stat-today-orders").textContent=Number(dashboardMetrics.today_orders||0);
 $("nav-products-count").textContent=products.length;$("nav-orders-count").textContent=pending;
 const recent=orders.slice(0,6);
 $("recent-orders").innerHTML=recent.length?tableOrders(recent,true):'<div class="empty-row">ماكو طلبات لحد الآن.</div>';
 const week=dashboardMetrics.weekly_sales||[],max=Math.max(1,...week.map(x=>Number(x.sales)||0));
 $("weekly-sales").innerHTML=week.map(x=>'<div class="week-bar"><div class="week-bar-value">'+money(x.sales)+'</div><div class="week-bar-track"><i style="height:'+Math.max(3,Number(x.sales||0)/max*100)+'%"></i></div><small>'+new Date(x.day+"T12:00:00").toLocaleDateString("ar-IQ",{weekday:"short"})+'</small></div>').join("")||'<p class="muted">لا توجد مبيعات مسجلة خلال هذه الفترة.</p>';
 const tops=dashboardMetrics.top_products||[];
 $("top-products").innerHTML=tops.length?tops.map((x,i)=>'<div class="top-product-row"><b>'+(i+1)+'. '+esc(x.name)+'</b><span>'+Number(x.quantity)+' قطعة · '+money(x.sales)+'</span></div>').join(""):'<p class="muted">تظهر المنتجات الأكثر مبيعاً بعد إتمام الطلبات.</p>';
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
 const canDelete=["owner","admin"].includes(profile?.role);
 return '<table><thead><tr><th>رقم الطلب</th><th>الزبون</th><th>الهاتف</th><th>المجموع</th><th>الحالة</th>'+(compact?"":"<th>الدفع</th><th>التاريخ</th>")+'<th>الإجراءات</th></tr></thead><tbody>'+rows.map(o=>'<tr><td>#'+esc(o.order_number??o.id.slice(0,8))+'</td><td>'+esc(o.customer_name)+'</td><td>'+esc(o.phone)+'</td><td>'+money(o.total)+'</td><td><select class="inline-select" data-order-status="'+o.id+'">'+Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'" '+(o.status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></td>'+(compact?"":'<td><select class="inline-select" data-payment-status="'+o.id+'">'+Object.entries(PAYMENT).map(([k,v])=>'<option value="'+k+'" '+(o.payment_status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></td><td>'+new Date(o.created_at).toLocaleDateString("ar-IQ")+'</td>')+'<td><button class="action-btn" data-order-detail="'+o.id+'">عرض</button>'+(compact||!canDelete?"":'<button class="action-btn danger" data-order-delete="'+o.id+'">حذف</button>')+'</td></tr>').join("")+'</tbody></table>';
}
function renderOrders(){
 const q=($("order-search")?.value||"").trim().toLowerCase(),st=$("order-status-filter").value;
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
 try{
  let error=null;
  if(Object.prototype.hasOwnProperty.call(patch,"status")){
   const result=await db.rpc("admin_update_order_status",{p_order_id:id,p_status:patch.status});error=result.error;
  }else{
   const result=await db.from("orders").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);error=result.error;
  }
  if(error)throw error;
  toast("تم تحديث الطلب والمخزون وسجل التغييرات");await loadAll();
 }catch(e){toast("تعذر تحديث الطلب: "+e.message);await loadAll()}
}
async function deleteOrder(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 const label="#"+(o.order_number??id.slice(0,8));
 if(!["owner","admin"].includes(profile?.role)){toast("حذف الطلبات متاح للمالك والمدير فقط");return}
 if(!window.confirm("تأكيد حذف الطلب "+label+" للزبون "+(o.customer_name||"—")+"؟\\nسيتم حفظ سجل الحذف، وإرجاع الكمية للمخزون فقط إذا كان الطلب غير مشحون وغير مكتمل. لا يمكن التراجع عن حذف السجل."))return;
 try{
  const {error}=await db.rpc("admin_delete_order",{p_order_id:id});
  if(error)throw error;
  orders=orders.filter(x=>x.id!==id);
  toast("تم حذف الطلب "+label+" مع معالجة المخزون وسجل الحذف");await loadAll();
  if($("order-dialog").open)$("order-dialog").close();
 }catch(e){console.error(e);toast("تعذر حذف الطلب: "+(e.message||"حدث خطأ"));}
}
async function showOrder(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 const fields=[["رقم الطلب","#"+(o.order_number??"")],["الزبون",o.customer_name],["الهاتف",o.phone],["المحافظة",o.province],["المنطقة",o.district||o.city||"—"],["العنوان",o.address],["طريقة الدفع",o.payment_method==="cod"?"عند الاستلام":o.payment_method],["حالة الدفع",PAYMENT[o.payment_status]||o.payment_status],["قيمة المنتجات",money(o.subtotal??o.total)],["أجور التوصيل",money(o.delivery_fee||0)],["المجموع النهائي",money(o.total)],["ملاحظات",o.notes||"—"]];
 $("order-details").innerHTML='<div class="order-detail-grid">'+fields.map(x=>'<div class="detail-box"><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></div>').join("")+'</div><table class="order-items"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>'+(o.order_items||[]).map(i=>'<tr><td>'+esc(i.product_name)+'</td><td>'+i.quantity+'</td><td>'+money(i.unit_price)+'</td><td>'+money(i.line_total)+'</td></tr>').join("")+'</tbody></table>';
 $("order-dialog").showModal();
 $("order-history-list").textContent="جارٍ تحميل سجل التغييرات...";
 const {data:history,error}=await db.from("order_status_history").select("event_type,from_status,to_status,actor_id,details,created_at").eq("order_id",id).order("created_at",{ascending:false}).limit(30);
 $("order-history-list").innerHTML=error?'<p class="muted">تعذر تحميل السجل.</p>':(history||[]).map(x=>'<div class="history-row"><b>'+({created:"إنشاء الطلب",status:"تغيير الحالة",payment:"تغيير الدفع",deleted:"حذف الطلب"}[x.event_type]||x.event_type)+'</b><span>'+(x.from_status?esc(STATUS[x.from_status]||PAYMENT[x.from_status]||x.from_status)+" ← ":"")+(esc(STATUS[x.to_status]||PAYMENT[x.to_status]||x.to_status||"—"))+'</span><small>'+new Date(x.created_at).toLocaleString("ar-IQ")+'</small></div>').join("")||'<p class="muted">لا توجد تغييرات مسجلة لهذا الطلب.</p>';
}
function renderStockMovements(){
 const el=$("stock-movements");if(!el)return;
 el.innerHTML=stockMovements.length?'<div class="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>قبل</th><th>بعد</th><th>التغيير</th><th>السبب</th><th>التاريخ</th></tr></thead><tbody>'+stockMovements.map(x=>'<tr><td>'+esc(x.product_name)+'</td><td>'+x.old_stock+'</td><td>'+x.new_stock+'</td><td class="'+(x.quantity_delta>0?'stock-up':'stock-down')+'">'+(x.quantity_delta>0?'+':'')+x.quantity_delta+'</td><td>'+esc(x.reason)+'</td><td>'+new Date(x.created_at).toLocaleString("ar-IQ")+'</td></tr>').join("")+'</tbody></table></div>':'<p class="muted">سجل حركة المخزون يبدأ بتسجيل التعديلات من الآن فصاعداً.</p>';
}
function renderOrderAudit(){
 const el=$("order-audit-log");if(!el)return;
 const names={created:"إنشاء طلب",status:"تغيير حالة",payment:"تغيير حالة الدفع",deleted:"حذف طلب"};
 el.innerHTML=orderEvents.length?'<div class="admin-table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العملية</th><th>التغيير</th><th>التاريخ</th></tr></thead><tbody>'+orderEvents.map(x=>'<tr><td>#'+esc(x.order_number??"—")+'</td><td>'+esc(names[x.event_type]||x.event_type)+'</td><td>'+esc(STATUS[x.from_status]||PAYMENT[x.from_status]||x.from_status||"—")+' '+(x.to_status?'← '+esc(STATUS[x.to_status]||PAYMENT[x.to_status]||x.to_status):"")+'</td><td>'+new Date(x.created_at).toLocaleString("ar-IQ")+'</td></tr>').join("")+'</tbody></table></div>':'<p class="muted">لا توجد عمليات مسجلة بعد.</p>';
}

function renderDeliveryRates(){const el=$("delivery-rates-list");if(!el)return;el.innerHTML=deliveryRatesAdmin.map((r,i)=>'<label class="delivery-rate-row"><b>'+esc(r.governorate)+'</b><input type="number" min="0" step="500" data-delivery-governorate="'+esc(r.governorate)+'" value="'+Number(r.fee||0)+'" aria-label="أجرة توصيل '+esc(r.governorate)+'"><span>د.ع</span></label>').join("")||'<p class="muted">لا توجد محافظات معرفة.</p>';}
async function saveDeliveryRates(){const btn=$("save-delivery-rates"),msg=$("delivery-rates-message");btn.disabled=true;msg.textContent="جارٍ حفظ الأجور...";try{const rows=[...document.querySelectorAll("[data-delivery-governorate]")].map(x=>({governorate:x.dataset.deliveryGovernorate,fee:Math.max(0,Number(x.value)||0),is_active:true,updated_at:new Date().toISOString()}));const {error}=await db.from("delivery_rates").upsert(rows,{onConflict:"governorate"});if(error)throw error;deliveryRatesAdmin=rows;msg.textContent="تم حفظ أجور التوصيل. ستظهر للزبون عند اختيار المحافظة.";toast("تم حفظ أجور التوصيل");}catch(e){msg.textContent="تعذر حفظ الأجور: "+e.message;}finally{btn.disabled=false;}}
function renderReviewModeration(){const el=$("reviews-moderation-list");if(!el)return;el.innerHTML=productReviews.length?'<div class="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>الزبون</th><th>التقييم</th><th>الرأي</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>'+productReviews.map(r=>'<tr><td>'+esc(r.products?.name||"منتج")+'</td><td>'+esc(r.customer_name)+'</td><td>'+("★".repeat(r.rating))+'</td><td>'+esc(r.review_text)+'</td><td><span class="badge '+(r.is_approved?"good":"off")+'">'+(r.is_approved?"منشور":"بانتظار الموافقة")+'</span></td><td><button class="action-btn" data-review-toggle="'+r.id+'">'+(r.is_approved?"إخفاء":"موافقة ونشر")+'</button></td></tr>').join("")+'</tbody></table></div>':'<p class="muted">ماكو تقييمات مستلمة لحد الآن.</p>';}
async function toggleReview(id){const r=productReviews.find(x=>x.id===id);if(!r)return;const {error}=await db.from("product_reviews").update({is_approved:!r.is_approved}).eq("id",id);if(error){toast("تعذر تحديث التقييم: "+error.message);return;}r.is_approved=!r.is_approved;renderReviewModeration();toast(r.is_approved?"تم نشر التقييم":"تم إخفاء التقييم");}

function renderBanners(){
 const el=$("banners-list");if(!el)return;
 el.innerHTML=banners.length?banners.map(x=>'<article class="banner-admin-row"><img src="'+esc(x.image_url)+'" alt=""><div class="banner-admin-copy"><b>'+esc(x.title||"بانر بدون عنوان")+'</b><small>'+esc(x.subtitle||"")+'</small><span class="badge '+(x.is_active?"good":"off")+'">'+(x.is_active?"ظاهر بالواجهة":"غير مفعل")+'</span></div><div class="banner-admin-actions"><button class="action-btn" data-banner-edit="'+x.id+'">تعديل</button><button class="action-btn" data-banner-toggle="'+x.id+'">'+(x.is_active?"إيقاف":"تفعيل")+'</button><button class="action-btn danger" data-banner-delete="'+x.id+'">حذف</button></div></article>').join(""):'<div class="empty-row">ماكو بانرات محفوظة. أضف أول بانر من النموذج أعلاه.</div>';
}
function resetBannerForm(){
 const f=$("banner-form");f.reset();f.elements.id.value="";f.elements.image_url.value="";f.elements.button_text.value="اكتشف العرض";f.elements.link_url.value="#products";f.elements.is_active.checked=true;
 if(bannerPreviewUrl)URL.revokeObjectURL(bannerPreviewUrl);bannerPreviewUrl="";bannerFile=null;$("banner-image").value="";$("banner-form-heading").textContent="إضافة بانر جديد";$("banner-image-preview").innerHTML='<small class="muted">لم يتم اختيار صورة بعد.</small>';setError("banner-form-error","");
}
function openBanner(id){
 resetBannerForm();const x=banners.find(v=>v.id===id);if(!x)return;const f=$("banner-form");
 f.elements.id.value=x.id;f.elements.title.value=x.title||"";f.elements.subtitle.value=x.subtitle||"";f.elements.button_text.value=x.button_text||"اكتشف العرض";f.elements.link_url.value=x.link_url||"#products";f.elements.image_url.value=x.image_url;f.elements.is_active.checked=!!x.is_active;
 $("banner-form-heading").textContent="تعديل البانر";$("banner-image-preview").innerHTML='<img src="'+esc(x.image_url)+'" alt="معاينة البانر"><small>الصورة الحالية — ارفع صورة جديدة لاستبدالها</small>';
}
async function saveBanner(e){
 e.preventDefault();const f=e.currentTarget,btn=$("save-banner-btn");setError("banner-form-error","");const current=f.elements.image_url.value;
 if(!bannerFile&&!current){setError("banner-form-error","اختار صورة للبانر أولاً.");return}
 if(bannerFile&&(!/^image\/(jpeg|png|webp|avif)$/.test(bannerFile.type)||bannerFile.size>8*1024*1024)){setError("banner-form-error","الصورة لازم تكون JPG أو PNG أو WEBP أو AVIF وحجمها أقل من 8MB.");return}
 btn.disabled=true;btn.textContent="جاري رفع الصورة والحفظ...";
 try{let imageUrl=current;if(bannerFile){const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[bannerFile.type]||"jpg";const path="banners/"+crypto.randomUUID()+"."+ext;const up=await db.storage.from(BUCKET).upload(path,bannerFile,{cacheControl:"31536000",contentType:bannerFile.type,upsert:false});if(up.error)throw up.error;imageUrl=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
 const id=f.elements.id.value,active=f.elements.is_active.checked;if(active){const off=await db.from("home_banners").update({is_active:false}).eq("is_active",true);if(off.error)throw off.error}
 const payload={title:f.elements.title.value.trim(),subtitle:f.elements.subtitle.value.trim(),button_text:f.elements.button_text.value.trim()||"اكتشف العرض",link_url:f.elements.link_url.value.trim()||"#products",image_url:imageUrl,is_active:active,updated_at:new Date().toISOString()};
 const result=id?await db.from("home_banners").update(payload).eq("id",id):await db.from("home_banners").insert(payload);if(result.error)throw result.error;
 toast(id?"تم تحديث البانر":"تمت إضافة البانر");resetBannerForm();await loadAll();
 }catch(err){console.error(err);setError("banner-form-error","تعذر حفظ البانر: "+(err.message||"تحقق من الاتصال والصلاحيات"))}finally{btn.disabled=false;btn.textContent="حفظ البانر"}
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
 const titles={overview:"نظرة عامة",products:"إدارة المنتجات",orders:"إدارة الطلبات",categories:"أقسام المتجر",banners:"بانر العروض"};
 $("page-title").textContent=titles[view]||"لوحة الإدارة";$("app").classList.remove("menu-open");
}
async function exportOrders(){
 try{
  let all=[],from=0,batch=500;
  while(true){const {data,error}=await db.from("orders").select("order_number,customer_name,phone,province,district,address,payment_method,payment_status,status,total,created_at,notes").order("created_at",{ascending:false}).range(from,from+batch-1);if(error)throw error;all.push(...(data||[]));if(!data||data.length<batch)break;from+=batch}
  const headers=["رقم الطلب","اسم الزبون","الهاتف","المحافظة","المنطقة","العنوان","طريقة الدفع","حالة الدفع","حالة الطلب","المجموع","التاريخ","ملاحظات"];
  const rows=all.map(o=>[o.order_number,o.customer_name,o.phone,o.province,o.district,o.address,o.payment_method,o.payment_status,STATUS[o.status]||o.status,o.total,new Date(o.created_at).toLocaleString("ar-IQ"),o.notes]);
  const csv="\uFEFF"+[headers,...rows].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="honor-orders-"+new Date().toISOString().slice(0,10)+".csv";a.click();URL.revokeObjectURL(url);toast("تم تصدير "+all.length+" طلب");
 }catch(e){toast("تعذر تصدير الطلبات: "+e.message)}
}
function bind(){
 $("login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=e.currentTarget.querySelector("button");b.disabled=true;b.textContent="جاري التحقق...";const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});b.disabled=false;b.textContent="دخول إلى لوحة الإدارة";if(error){setError("login-error","بيانات الدخول غير صحيحة أو تعذر الاتصال.");return}if(await checkAccess())await loadAll()};
 $("logout-btn").onclick=async()=>{await db.auth.signOut();location.reload()};
 document.querySelectorAll(".nav-link").forEach(b=>b.onclick=()=>go(b.dataset.view));
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 document.querySelectorAll("[data-open-product]").forEach(b=>b.onclick=()=>openProduct());
 document.querySelectorAll("[data-close-dialog]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
 $("product-form").onsubmit=saveProduct;
  $("banner-form").onsubmit=saveBanner;$("banner-reset").onclick=resetBannerForm;
  $("banner-image").onchange=e=>{const file=e.target.files&&e.target.files[0];if(!file)return;bannerFile=file;if(bannerPreviewUrl)URL.revokeObjectURL(bannerPreviewUrl);bannerPreviewUrl=URL.createObjectURL(file);$("banner-image-preview").innerHTML='<img src="'+bannerPreviewUrl+'" alt="معاينة البانر"><small>معاينة الصورة الجديدة</small>'};
  $("banners-list").addEventListener("click",async e=>{const edit=e.target.closest("[data-banner-edit]"),toggle=e.target.closest("[data-banner-toggle]"),del=e.target.closest("[data-banner-delete]");if(edit){openBanner(edit.dataset.bannerEdit);return}if(toggle){const x=banners.find(v=>v.id===toggle.dataset.bannerToggle);if(!x)return;try{if(!x.is_active){const off=await db.from("home_banners").update({is_active:false}).eq("is_active",true);if(off.error)throw off.error}const up=await db.from("home_banners").update({is_active:!x.is_active,updated_at:new Date().toISOString()}).eq("id",x.id);if(up.error)throw up.error;toast(x.is_active?"تم إيقاف البانر":"تم تفعيل البانر");await loadAll()}catch(err){toast("تعذر تحديث البانر: "+err.message)}return}if(del){if(!confirm("متأكد من حذف هذا البانر؟"))return;const rm=await db.from("home_banners").delete().eq("id",del.dataset.bannerDelete);if(rm.error){toast("تعذر حذف البانر: "+rm.error.message);return}toast("تم حذف البانر");await loadAll()}});
 $("product-images").onchange=e=>{const selected=[...e.target.files];newFiles.push(...selected);cleanupPreviews();renderImagePreview();e.target.value=""};
 ["product-search","product-category-filter","product-state-filter"].forEach(id=>$(id).addEventListener(id==="product-search"?"input":"change",renderProducts));
 ["order-search","order-status-filter"].forEach(id=>$(id).addEventListener(id==="order-search"?"input":"change",renderOrders));
 $("refresh-orders").onclick=loadAll;$("menu-toggle").onclick=()=>$("app").classList.toggle("menu-open");

 $("admin-export-orders")?.addEventListener("click",exportOrders);
 $("save-delivery-rates")?.addEventListener("click",saveDeliveryRates);
 $("reviews-moderation-list")?.addEventListener("click",e=>{const b=e.target.closest("[data-review-toggle]");if(b)toggleReview(b.dataset.reviewToggle)});
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