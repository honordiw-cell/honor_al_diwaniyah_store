const IRAQI_GOVERNORATES = ["بغداد","البصرة","نينوى","أربيل","السليمانية","دهوك","كركوك","ديالى","الأنبار","بابل","كربلاء","النجف","القادسية","المثنى","ذي قار","ميسان","واسط","صلاح الدين"];
const demoProducts = [
 {id:"p1",name:"HONOR X9d",category:"هواتف",description:"بطارية قوية وتجربة استخدام مميزة",price:493000,image:"",tag:"الأكثر طلباً"},
 {id:"p2",name:"HONOR 600",category:"هواتف",description:"تصميم أنيق وأداء متوازن",price:645000,image:"",tag:"جديد"},
 {id:"p3",name:"HONOR X7e",category:"هواتف",description:"خيار عملي للاستخدام اليومي",price:235000,image:"",tag:""},
 {id:"p4",name:"HONOR Pad",category:"تابلت",description:"شاشة واسعة للدراسة والترفيه",price:290000,image:"",tag:""},
 {id:"p5",name:"سماعات HONOR",category:"إكسسوارات",description:"صوت واضح واتصال لاسلكي",price:45000,image:"",tag:""},
 {id:"p6",name:"شاحن سريع",category:"إكسسوارات",description:"شحن عملي للأجهزة المتوافقة",price:25000,image:"",tag:""}
];

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
const cfg = window.STORE_CONFIG || {};
const hasBackend = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
let sb = null;
let products = hasBackend ? [] : [...demoProducts];
let cart = JSON.parse(localStorage.getItem("honor-cart")||"[]");
let activeCategory = "الكل";
let visibleProductCount = 8;
const productsPerPage = 8;
let storeCategories = [];
let productLoadMessage = "";

if (hasBackend && window.supabase?.createClient) {
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
}

function toast(msg){
 const t=$("toast");
 t.textContent=msg;
 t.classList.add("show");
 setTimeout(()=>t.classList.remove("show"),2400);
}
function persistCart(){
 localStorage.setItem("honor-cart",JSON.stringify(cart));
 renderCart();
}
function escapeHtml(s=""){
 return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function renderProducts(){
 const q=$("search-input").value.trim().toLowerCase();
 const filtered=products.filter(p=>
   (activeCategory==="الكل"||String(p.categoryId)===String(activeCategory)) &&
   (`${p.name} ${p.description||""} ${p.brand||""}`).toLowerCase().includes(q)
 );
 const visibleProducts=filtered.slice(0,visibleProductCount);
 $("product-grid").innerHTML=visibleProducts.map(p=>`<article class="product-card">
   ${p.tag?`<span class="product-tag">${escapeHtml(p.tag)}</span>`:""}
   <button type="button" class="product-view" data-details="${escapeHtml(p.id)}" aria-label="تفاصيل ${escapeHtml(p.name)}">
     <div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:`<div class="product-placeholder"><span>${escapeHtml(p.brand||"TECH")}</span><b>${escapeHtml(p.name)}</b><small>HONOR AL-DIWANIYAH</small></div>`}</div>
     <div class="product-card-copy">
       <span class="product-brand">${escapeHtml(p.brand||p.category||"")}</span>
       <h3>${escapeHtml(p.name)}</h3>
       <div class="product-meta">${[p.ram,p.storage].filter(Boolean).map(escapeHtml).join(" · ")||escapeHtml(p.description||p.category||"")}</div>
       <div class="product-price-row"><b class="price">${money(p.price)}</b>${p.oldPrice>p.price?`<del class="old-price">${money(p.oldPrice)}</del>`:""}</div>
     </div>
   </button>
   <div class="product-bottom"><button class="add-btn" data-add="${escapeHtml(p.id)}">أضف للسلة</button><span class="details-hint">التفاصيل ←</span></div>
 </article>`).join("");
 const empty=$("empty-state");
 empty.classList.toggle("hidden",filtered.length>0);
 if(!filtered.length && productLoadMessage) empty.textContent=productLoadMessage;
 else empty.textContent="ماكو منتجات تطابق بحثك حالياً.";
 const moreButton=$("load-more-products");
 if(moreButton){
   moreButton.classList.toggle("hidden",filtered.length<=visibleProductCount);
   moreButton.textContent=`عرض المزيد (${filtered.length-visibleProductCount})`;
 }
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
 document.querySelectorAll("[data-details]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.details)));
}
function showProductDetails(id){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return;
 const dialog=$("product-details-dialog");
 if(!dialog)return;
 const image=p.image||(p.images&&p.images[0])||"";
 $("product-details-content").innerHTML='<div class="product-detail-image">'+(image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(p.name)+'">':'<span>صورة المنتج غير متوفرة</span>')+'</div>'+
 '<div class="product-detail-info"><span class="eyebrow">'+escapeHtml(p.brand||"HONOR AL-DIWANIYAH")+'</span><h2>'+escapeHtml(p.name)+'</h2><b class="price">'+money(p.price)+'</b>'+
 (p.oldPrice>p.price?'<del class="old-price">'+money(p.oldPrice)+'</del>':"")+
 '<p class="detail-description">'+escapeHtml(p.description||"")+"</p>"+
 '<div class="detail-specs">'+
 (p.ram?'<div><span>الرام</span><b>'+escapeHtml(p.ram)+'</b></div>':"")+
 (p.storage?'<div><span>الذاكرة</span><b>'+escapeHtml(p.storage)+'</b></div>':"")+
 (p.chipset?'<div><span>المعالج</span><b>'+escapeHtml(p.chipset)+'</b></div>':"")+
 (p.screen?'<div><span>الشاشة</span><b>'+escapeHtml(p.screen)+'</b></div>':"")+
 (p.camera?'<div><span>الكاميرات</span><b>'+escapeHtml(p.camera)+'</b></div>':"")+
 (p.battery?'<div><span>البطارية والشحن</span><b>'+escapeHtml(p.battery)+'</b></div>':"")+
 (p.protection?'<div><span>مقاومة الماء والغبار</span><b>'+escapeHtml(p.protection)+'</b></div>':"")+
 (p.color?'<div><span>اللون</span><b>'+escapeHtml(p.color)+'</b></div>':"")+
 '<div><span>التوفر</span><b>'+(p.stock>0?"متوفر":"غير متوفر حالياً")+'</b></div></div>'+
 '<button type="button" class="primary-btn full" id="detail-add-cart" '+(p.stock<=0?"disabled":"")+">أضف للسلة +</button></div>";
 $("detail-add-cart").addEventListener("click",()=>{addToCart(p.id);dialog.close()});
 dialog.showModal();
}
function addToCart(id){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return;
 const stock=Math.max(0,Number(p.stock)||0);
 if(stock<=0){toast("نفذ من المخزون");return}
 const row=cart.find(x=>String(x.id)===String(id));
 if(row&&row.qty>=stock){toast("الكمية المتوفرة بالمخزون: "+stock);return}
 if(row)row.qty++;
 else cart.push({id:p.id,name:p.name,price:Number(p.price)||0,qty:1});
 persistCart();
 toast("انضاف المنتج إلى السلة");
}
function renderCart(){
 $("cart-count").textContent=cart.reduce((a,x)=>a+x.qty,0);
 $("cart-items").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><b>${escapeHtml(x.name)}</b><small>${money(x.price)} × ${x.qty}</small></div><div class="qty-controls"><button data-dec="${escapeHtml(x.id)}">−</button><b>${x.qty}</b><button data-inc="${escapeHtml(x.id)}">+</button></div></div>`).join(""):`<p class="empty-state">السلة فارغة حالياً.</p>`;
 const total=cart.reduce((a,x)=>a+(Number(x.price)||0)*x.qty,0);
 $("cart-total").textContent=money(total);
 $("checkout-total").textContent=money(total);
 document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
 document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
}
function changeQty(id,d){
 const x=cart.find(x=>String(x.id)===String(id));
 if(!x)return;
 if(d>0){
   const p=products.find(p=>String(p.id)===String(id));
   const stock=Math.max(0,Number(p?.stock)||0);
   if(stock<=0){toast("نفذ من المخزون");return}
   if(x.qty>=stock){toast("الكمية المتوفرة بالمخزون: "+stock);return}
 }
 x.qty+=d;
 cart=cart.filter(x=>x.qty>0);
 persistCart();
}
function openCart(){
 $("overlay").classList.add("show");
 $("cart-drawer").classList.add("open");
}
function closeCart(){
 $("overlay").classList.remove("show");
 $("cart-drawer").classList.remove("open");
}
function initGovernors(){
 $("checkout-form").governorate.innerHTML='<option value="">اختر المحافظة</option>'+IRAQI_GOVERNORATES.map(x=>`<option>${x}</option>`).join("");
}
function categoryIcon(category){
 const slug=String(category?.slug||"").toLowerCase();
 const name=String(category?.name||"");
 if(slug.includes("tablet") || name.includes("تابلت")) return "▤";
 if(slug.includes("accessor") || name.includes("إكسسوارات")) return "♬";
 if(slug.includes("maint") || name.includes("صيانة")) return "⚙";
 if(slug.includes("apple") || name.includes("آيفون")) return "";
 return "▯";
}
function renderCategories(categories){
 storeCategories=categories||[];
 const grid=$("category-grid");
 const categoryOrder=["tablets","honor","redmi","apple","samsung","xiaomi","infinix","tecno","realme","poco","motorola"];
 storeCategories.sort((a,b)=>{
   const ai=categoryOrder.indexOf(a.slug), bi=categoryOrder.indexOf(b.slug);
   return (ai<0?999:ai)-(bi<0?999:bi);
 });
 const phoneCategories=storeCategories.filter(c=>!["accessories","maintenance"].includes(c.slug));
 const items=[{id:"الكل",name:"كل المنتجات",slug:"all"},...phoneCategories];
 grid.innerHTML=items.map((c,i)=>`<button class="category-card ${i===0?"active":""}" data-category="${escapeHtml(c.id)}"><span>${i===0?"▣":categoryIcon(c)}</span><b>${escapeHtml(c.name)}</b></button>`).join("");
 grid.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{
   grid.querySelectorAll(".category-card").forEach(x=>x.classList.remove("active"));
   b.classList.add("active");
   activeCategory=b.dataset.category;
   visibleProductCount=productsPerPage;
   renderProducts();
 }));
}
async function loadProducts(){
 if(!hasBackend){
   products=[...demoProducts];
   renderProducts();
   return;
 }
 if(!sb){
   products=[];
   productLoadMessage="مكتبة الاتصال بقاعدة البيانات لم تُحمّل. حدّث الصفحة أو راجع إعداد المكتبة.";
   renderProducts();
   console.error("Supabase client library is unavailable.");
   return;
 }

 productLoadMessage="جاري تحميل المنتجات...";
 renderProducts();

 try{
   const [{data:categories,error:categoryError},{data:rows,error:productError}]=await Promise.all([
     sb.from("categories").select("id,name,slug").eq("is_active",true),
     sb.from("products").select("id,category_id,name,description,price,old_price,stock,image_url,images,brand,ram,storage,color,is_active,created_at").eq("is_active",true).order("created_at",{ascending:false})
   ]);

   if(productError) throw productError;

   const categoryMap=new Map((categories||[]).map(c=>[String(c.id),c]));
   products=(rows||[]).map(row=>{
     const category=categoryMap.get(String(row.category_id));
     const isX9d=/x\s*9d/i.test(row.name||"");
     return {
       id:String(row.id),
       name:row.name,
       categoryId:row.category_id||"",
       category:category?.name||"غير مصنف",
       description:row.description||row.brand||category?.name||"",
       price:Number(row.price)||0,
       oldPrice:Number(row.old_price)||0,
       stock:Number(row.stock)||0,
       image:row.image_url||"",
       images:Array.isArray(row.images)?row.images:[],
       brand:row.brand||"",
       ram:row.ram||(isX9d?"12GB":""),
       storage:row.storage||(isX9d?"256GB":""),
       color:row.color||"",
       chipset:isX9d?"Snapdragon 6 Gen 4":"",
       screen:isX9d?"6.79 بوصة AMOLED — 120Hz":"",
       camera:isX9d?"108MP مع OIS + 5MP واسعة، أمامية 16MP":"",
       battery:isX9d?"8300mAh مع شحن سريع 66W":"",
       protection:isX9d?"IP66 / IP68 / IP69 / IP69K":"",
       tag:row.tag||""
     };
   });
   if(categoryError){
     console.error("Supabase categories load failed:",categoryError);
     renderCategories([]);
     productLoadMessage="تم تحميل المنتجات، لكن تعذّر تحميل الأقسام. راجع صلاحيات قراءة جدول categories.";
   }else{
     renderCategories(categories||[]);
     productLoadMessage="";
   }
   renderProducts();
 }catch(error){
   console.error("Supabase products load failed:",error);
   products=[];
   productLoadMessage="تعذّر تحميل المنتجات من قاعدة البيانات. تأكد من صلاحيات قراءة المنتجات والأقسام في Supabase.";
   renderProducts();
 }
}
async function submitOrder(e){
 e.preventDefault();
 if(!cart.length){toast("السلة فارغة");return}
 for(const item of cart){
   const p=products.find(p=>String(p.id)===String(item.id));
   const stock=Math.max(0,Number(p?.stock)||0);
   if(!p||stock<=0||item.qty>stock){
     toast(stock<=0?"نفذ من المخزون":"الكمية المطلوبة غير متوفرة حالياً");
     return;
   }
 }
 if(hasBackend&&!sb){
   $("form-message").textContent="الاتصال بقاعدة البيانات غير جاهز. حاول لاحقاً.";
   return;
 }
 const form=new FormData(e.currentTarget);
 const order={
   customer_name:form.get("customer_name"),
   phone:form.get("phone"),
   governorate:form.get("governorate"),
   district:form.get("district"),
   address:form.get("address"),
   payment_method:form.get("payment_method"),
   notes:form.get("notes"),
   items:cart.map(x=>({product_id:x.id,name:x.name,price:x.price,quantity:x.qty})),
   total:cart.reduce((a,x)=>a+x.price*x.qty,0),
   status:"new"
 };
 if(sb){
   $("form-message").textContent="جارٍ إرسال طلبك...";
   const {data:orderNumber,error}=await sb.rpc("submit_store_order",{
     p_customer_name:form.get("customer_name"),
     p_phone:form.get("phone"),
     p_province:form.get("governorate"),
     p_district:form.get("district"),
     p_address:form.get("address"),
     p_payment_method:form.get("payment_method"),
     p_notes:form.get("notes"),
     p_items:cart.map(x=>({product_id:x.id,quantity:x.qty}))
   });
   if(error){
     console.error("Order submission failed:",error);
     $("form-message").textContent=error.message||"تعذر إرسال الطلب حالياً. حاول مرة ثانية.";
     return;
   }
   $("form-message").textContent="تم استلام طلبك بنجاح. رقم طلبك: "+orderNumber;
 }else{
   const localOrders=JSON.parse(localStorage.getItem("honor-demo-orders")||"[]");
   order.id="DEMO-"+Date.now();
   localOrders.push(order);
   localStorage.setItem("honor-demo-orders",JSON.stringify(localOrders));
   $("form-message").textContent="تم تسجيل طلب تجريبي على هذا الجهاز. اربط قاعدة البيانات لاستقبال طلبات حقيقية.";
 }
 cart=[];
 persistCart();
 e.currentTarget.reset();
 setTimeout(()=>$("checkout-dialog").close(),3000);
}

// Category buttons are rendered dynamically from Supabase categories.
$("search-input").addEventListener("input",()=>{visibleProductCount=productsPerPage;renderProducts()});
if($("load-more-products")) $("load-more-products").addEventListener("click",()=>{visibleProductCount+=productsPerPage;renderProducts()});
$("search-toggle").onclick=()=>{$("search-box").scrollIntoView({behavior:"smooth"});$("search-input").focus()};
$("search-clear").onclick=()=>{$("search-input").value="";renderProducts()};
$("cart-open").onclick=openCart;
$("cart-close").onclick=closeCart;
$("overlay").onclick=closeCart;
$("checkout-open").onclick=()=>{if(!cart.length)return toast("السلة فارغة");closeCart();$("checkout-dialog").showModal()};
$("checkout-close").onclick=()=>$("checkout-dialog").close();
$("product-details-close").onclick=()=>$("product-details-dialog").close();
$("checkout-form").addEventListener("submit",submitOrder);
$("menu-toggle").onclick=()=>document.querySelector(".desktop-nav").classList.toggle("mobile-open");
document.querySelectorAll("[data-nav-category]").forEach(link=>link.addEventListener("click",()=>{ const category=storeCategories.find(c=>c.slug===link.dataset.navCategory); if(category){ activeCategory=category.id; visibleProductCount=productsPerPage; renderProducts(); document.querySelectorAll("#category-grid .category-card").forEach(b=>b.classList.toggle("active",b.dataset.category===String(category.id))); } document.querySelector(".desktop-nav")?.classList.remove("mobile-open"); }));
$("year").textContent=new Date().getFullYear();
initGovernors();
renderProducts();
renderCart();
loadProducts();


/* Admin dashboard: open with ?admin=1 */
(function(){
 if(new URLSearchParams(location.search).get("admin")!=="1")return;
 const $a=id=>document.getElementById(id),escA=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const moneyA=n=>new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
 const cfgA=window.STORE_CONFIG||{},dbA=window.supabase?.createClient&&cfgA.supabaseUrl&&cfgA.supabaseAnonKey?window.supabase.createClient(cfgA.supabaseUrl,cfgA.supabaseAnonKey):null;
 let profA=null,prodA=[],catA=[],ordA=[];
 ["site-header","hero","benefits","categories","products","about","contact","overlay","cart-drawer","product-details-dialog","checkout-dialog"].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add("hidden")});
 document.querySelectorAll("main > section").forEach(el=>{if(!el.classList.contains("admin-screen"))el.classList.add("hidden")});
 $a("admin-login-view").classList.remove("hidden");
 function toastA(msg){const t=$("toast");if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}}
 function loginA(){ $a("admin-login-view").classList.remove("hidden");$a("admin-panel").classList.add("hidden") }
 function panelA(){ $a("admin-login-view").classList.add("hidden");$a("admin-panel").classList.remove("hidden");loadA() }
 async function authA(){
  if(!dbA){$a("admin-login-error").textContent="تعذر الاتصال بقاعدة البيانات.";return}
  const {data:{user}}=await dbA.auth.getUser();
  if(!user){loginA();return}
  const {data:p,error}=await dbA.from("profiles").select("id,full_name,role,is_active").eq("id",user.id).maybeSingle();
  if(error||!p||!p.is_active||!["owner","admin","staff"].includes(p.role)){await dbA.auth.signOut();loginA();$a("admin-login-error").textContent="هذا الحساب غير مخوّل لإدارة المتجر.";return}
  profA=p;panelA();
 }
 $a("admin-login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);$a("admin-login-error").textContent="";const {error}=await dbA.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){$a("admin-login-error").textContent="تعذر تسجيل الدخول. تأكد من البريد وكلمة المرور.";return}authA()});
 $a("admin-logout").onclick=async()=>{await dbA.auth.signOut();profA=null;loginA()};
 document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".admin-pane").forEach(x=>x.classList.add("hidden"));$a("admin-"+b.dataset.adminTab).classList.remove("hidden");document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x===b))});
 document.querySelectorAll("[data-admin-close]").forEach(b=>b.onclick=()=>$a(b.dataset.adminClose).close());
 async function loadA(){
  if(!profA)return;
  try{
   const rr=await Promise.all([dbA.from("products").select("*").order("created_at",{ascending:false}),dbA.from("categories").select("*").order("created_at",{ascending:false}),dbA.from("orders").select("id,order_number,customer_name,phone,province,district,address,notes,payment_method,status,total,created_at,order_items(product_name,quantity,line_total)").order("created_at",{ascending:false}).limit(100)]);
   for(const x of rr)if(x.error)throw x.error;[prodA,catA,ordA]=rr.map(x=>x.data||[]);renderA();
  }catch(e){console.error(e);toastA("تعذر تحميل البيانات: "+(e.message||"تحقق من الصلاحيات"))}
 }
 function statusA(s){return ({new:"جديد",confirmed:"مؤكد",processing:"قيد التجهيز",shipped:"تم الشحن",delivered:"مكتمل",cancelled:"ملغي"})[s]||s}
 function orderTableA(rows){return rows.length?'<div class="admin-table-wrap"><table><thead><tr><th>رقم</th><th>الزبون</th><th>التاريخ</th><th>المجموع</th><th>الحالة</th><th></th></tr></thead><tbody>'+rows.map(o=>'<tr><td>#'+escA(o.order_number||o.id.slice(0,8))+'</td><td>'+escA(o.customer_name)+'<br><small dir="ltr">'+escA(o.phone)+'</small></td><td>'+new Date(o.created_at).toLocaleDateString("ar-IQ")+'</td><td>'+moneyA(o.total)+'</td><td><span class="admin-pill">'+statusA(o.status)+'</span></td><td><button class="admin-mini" data-admin-order="'+o.id+'">تفاصيل</button></td></tr>').join("")+'</tbody></table></div>':'<div class="admin-empty">ماكو طلبات حالياً.</div>'}
 function renderA(){
  $a("admin-stat-products").textContent=prodA.filter(p=>p.is_active).length;$a("admin-stat-categories").textContent=catA.filter(c=>c.is_active).length;$a("admin-stat-orders").textContent=ordA.filter(o=>o.status==="new").length;$a("admin-stat-sales").textContent=moneyA(ordA.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0));
  $a("admin-recent-orders").innerHTML=orderTableA(ordA.slice(0,6));renderProdA();renderCatA();renderOrdA();
 }
 function renderProdA(){
  const q=($a("admin-product-search").value||"").toLowerCase(),rows=prodA.filter(p=>(p.name+" "+(p.brand||"")+" "+(p.sku||"")).toLowerCase().includes(q));
  $a("admin-products-list").innerHTML=rows.length?'<div class="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>السعر</th><th>السعر السابق</th><th>المخزون</th><th>الحالة</th><th></th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+escA(p.name)+'<br><small>'+escA(p.brand||"")+' '+escA(p.ram||"")+' '+escA(p.storage||"")+'</small></td><td>'+moneyA(p.price)+'</td><td>'+moneyA(p.old_price)+'</td><td>'+p.stock+'</td><td>'+ (p.is_active?"ظاهر":"مخفي")+'</td><td><button class="admin-mini" data-admin-edit="'+p.id+'">تعديل</button><button class="admin-mini" data-admin-toggle="'+p.id+'">'+(p.is_active?"إخفاء":"إظهار")+'</button></td></tr>').join("")+'</tbody></table></div>':'<div class="admin-empty">ماكو منتجات.</div>';
  $a("admin-product-category").innerHTML='<option value="">بدون قسم</option>'+catA.map(c=>'<option value="'+c.id+'">'+escA(c.name)+'</option>').join("");
 }
 function renderCatA(){$a("admin-categories-list").innerHTML=catA.map(c=>'<div class="category-item"><div><b>'+escA(c.name)+'</b><small>'+escA(c.slug)+' · '+(c.is_active?"فعال":"مخفي")+'</small></div><button class="admin-mini" data-admin-cat-toggle="'+c.id+'">'+(c.is_active?"إخفاء":"إظهار")+'</button></div>').join("")||'<div class="admin-empty">ماكو أقسام.</div>'}
 function renderOrdA(){const f=$a("admin-order-filter").value,rows=f==="all"?ordA:ordA.filter(o=>o.status===f);$a("admin-orders-list").innerHTML=orderTableA(rows)}
 $a("admin-product-search").oninput=renderProdA;$a("admin-order-filter").onchange=renderOrdA;
 $a("admin-add-product").onclick=()=>openProdA();function openProdA(id){const f=$a("admin-product-form");f.reset();f.elements.id.value="";f.elements.is_active.checked=true;if(id){const p=prodA.find(x=>x.id===id);Object.keys(p).forEach(k=>{if(f.elements[k]&&k!=="images")f.elements[k].value=p[k]??""});f.elements.is_active.checked=!!p.is_active}$a("admin-product-dialog").showModal()}
 $a("admin-products-list").addEventListener("click",async e=>{const edit=e.target.closest("[data-admin-edit]"),toggle=e.target.closest("[data-admin-toggle]");if(edit)openProdA(edit.dataset.adminEdit);if(toggle){const p=prodA.find(x=>x.id===toggle.dataset.adminToggle);const {error}=await dbA.from("products").update({is_active:!p.is_active}).eq("id",p.id);if(error){toastA(error.message);return}await loadA()}});
 $a("admin-product-form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));const payload={name:d.name,brand:d.brand||null,category_id:d.category_id||null,price:Number(d.price),old_price:d.old_price?Number(d.old_price):null,stock:Number(d.stock||0),ram:d.ram||null,storage:d.storage||null,sku:d.sku||null,image_url:d.image_url||null,description:d.description||null,is_active:f.elements.is_active.checked};const q=d.id?dbA.from("products").update(payload).eq("id",d.id):dbA.from("products").insert(payload);const {error}=await q;if(error){toastA("تعذر الحفظ: "+error.message);return}$a("admin-product-dialog").close();toastA("تم حفظ المنتج");await loadA()};
 $a("admin-add-category").onclick=()=>$a("admin-category-dialog").showModal();
 $a("admin-category-form").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const {error}=await dbA.from("categories").insert({name:d.name.trim(),slug:d.slug.trim().toLowerCase(),is_active:true});if(error){toastA("تعذرت إضافة القسم: "+error.message);return}$a("admin-category-dialog").close();toastA("تمت إضافة القسم");await loadA()};
 $a("admin-categories-list").addEventListener("click",async e=>{const b=e.target.closest("[data-admin-cat-toggle]");if(!b)return;const c=catA.find(x=>x.id===b.dataset.adminCatToggle);const {error}=await dbA.from("categories").update({is_active:!c.is_active}).eq("id",c.id);if(error){toastA(error.message);return}await loadA()});
 async function orderDetailA(id){const o=ordA.find(x=>x.id===id);if(!o)return;const items=o.order_items||[];const summary="الطلب #"+(o.order_number||o.id.slice(0,8))+"\\nالزبون: "+o.customer_name+"\\nالهاتف: "+o.phone+"\\nالعنوان: "+(o.province||"")+" - "+(o.district||"")+"\\n"+(o.address||"")+"\\n\\nالمنتجات:\\n"+items.map(i=>i.product_name+" × "+i.quantity+" — "+moneyA(i.line_total)).join("\\n")+"\\n\\nالمجموع: "+moneyA(o.total)+"\\nالحالة الحالية: "+statusA(o.status);alert(summary);const status=prompt("اكتب الحالة الجديدة: new / confirmed / processing / shipped / delivered / cancelled",o.status);if(status===null)return;if(!["new","confirmed","processing","shipped","delivered","cancelled"].includes(status)){toastA("الحالة غير صحيحة");return}const {error}=await dbA.from("orders").update({status}).eq("id",id);if(error){toastA(error.message);return}toastA("تم تحديث الطلب");await loadA()}
 document.addEventListener("click",e=>{const b=e.target.closest("[data-admin-order]");if(b)orderDetailA(b.dataset.adminOrder)});
 authA();
})();
