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
let favoriteIds = JSON.parse(localStorage.getItem("honor-favorites")||"[]");
let compareIds = JSON.parse(localStorage.getItem("honor-compare")||"[]");
let selectedBrand = "الكل";
let selectedDeviceType = "الكل";
let visibleProductCount = 8;
const productsPerPage = 8;
let selectedAvailability = "all";
const WHATSAPP_NUMBER = "9647874400300";
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
 const q=($("products-search-input")?.value||$("search-input").value).trim().toLowerCase();
 const filtered=products.filter(p=>{
   const type=p.deviceType||"phone";
   const brand=String(p.brand||"").trim()||"بدون ماركة";
   return (selectedBrand==="الكل"||brand.toLowerCase()===selectedBrand.toLowerCase()) &&
     (selectedDeviceType==="الكل"||type===selectedDeviceType) &&
     (selectedAvailability==="all"||(selectedAvailability==="available"&&Number(p.stock)>0)||(selectedAvailability==="unavailable"&&Number(p.stock)<=0)) &&
     (`${p.name} ${p.description||""} ${p.brand||""}`).toLowerCase().includes(q);
 });
 // المتوفر أولاً، ثم نفذت الكمية مع الحفاظ على ترتيب المنتجات داخل كل مجموعة.
  const sortedProducts=[...filtered].sort((a,b)=>(Number(b.stock)>0?1:0)-(Number(a.stock)>0?1:0));
  const visibleProducts=sortedProducts.slice(0,visibleProductCount);
 $("product-grid").innerHTML=visibleProducts.map(p=>`<article class="product-card">
   ${p.tag?`<span class="product-tag">${escapeHtml(p.tag)}</span>`:""}
   <button type="button" class="product-view" data-details="${escapeHtml(p.id)}" aria-label="تفاصيل ${escapeHtml(p.name)}">
     <div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:`<div class="product-placeholder"><span>${escapeHtml(p.brand||"TECH")}</span><b>${escapeHtml(p.name)}</b><small>HONOR AL-DIWANIYAH</small></div>`}</div>
     <div class="product-card-copy">
       <span class="product-brand">${escapeHtml(p.brand||p.category||"")}</span>
       <h3>${escapeHtml(p.name)}</h3>
       <div class="product-meta">${[p.ram,p.storage].filter(Boolean).map(escapeHtml).join(" · ")||escapeHtml(p.description||p.category||"")}</div>
       <div class="product-price-row"><b class="price">${money(p.price)}</b>${p.oldPrice>p.price?`<del class="old-price">${money(p.oldPrice)}</del>`:""}</div><small class="product-stock-note ${p.stock>0?"in-stock":"out-stock"}">${p.stock>0?"متوفر · الكمية: "+Number(p.stock):"نفذت الكمية حالياً"}</small>
     </div>
   </button>
   <div class="product-bottom">${p.stock>0?`<button class="add-btn" data-add="${escapeHtml(p.id)}">أضف للسلة</button>`:`<a class="add-btn stock-inquiry" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("أريد الاستفسار عن توفر "+p.name)}" target="_blank" rel="noopener">اسأل عن التوفر</a>`}<span class="details-hint">التفاصيل ←</span><button type="button" class="product-tool-btn" data-favorite="${escapeHtml(p.id)}" aria-label="إضافة للمفضلة">${favoriteIds.includes(String(p.id))?"♥":"♡"}</button><button type="button" class="product-tool-btn" data-compare="${escapeHtml(p.id)}">مقارنة ⇄</button></div>
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
 renderHomeCollections();
 renderFavorites();
}
async function loadHomeBanner(){
 const section=$("home-promo-banner");if(!section||!sb)return;
 try{const result=await sb.from("home_banners").select("title,subtitle,image_url,button_text,link_url").eq("is_active",true).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(result.error)throw result.error;const data=result.data;if(!data){section.classList.add("hidden");return}
 $("home-promo-image").src=data.image_url;$("home-promo-image").alt=data.title||"عرض خاص";$("home-promo-title").textContent=data.title||"";$("home-promo-subtitle").textContent=data.subtitle||"";$("home-promo-button").textContent=data.button_text||"اكتشف العرض";$("home-promo-link").href=data.link_url||"#products";section.classList.remove("hidden");
 }catch(error){console.warn("Home banner unavailable:",error);section.classList.add("hidden")}
}
function renderHomeCollections(){
 const available=products.filter(p=>p.stock>0);
 const phones=products.filter(p=>p.isFeatured&&(p.deviceType==="phone"||p.deviceType==="tablet")).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);
 const accessories=available.filter(p=>p.deviceType==="accessories").sort((a,b)=>(b.isFeatured?1:0)-(a.isFeatured?1:0)||new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);
 const deals=products.filter(p=>p.oldPrice>p.price&&p.stock>0).slice(0,4);
 const card=p=>'<article class="home-product-card"><button type="button" class="home-product-open" data-home-details="'+escapeHtml(p.id)+'"><div class="home-product-image">'+(p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'" loading="lazy">':'<span>HONOR AL-DIWANIYAH</span>')+'</div><small>'+escapeHtml(p.brand||p.category||"")+'</small><b>'+escapeHtml(p.name)+'</b><strong>'+money(p.price)+'</strong></button></article>';
 const l=$("home-latest-grid"),a=$("home-accessories-grid"),d=$("home-deals-grid");
 if(l)l.innerHTML=phones.length?phones.map(card).join(""):'<p class="home-no-products">الأجهزة المميزة تظهر هنا قريباً.</p>';
 if(a)a.innerHTML=accessories.length?accessories.map(card).join(""):'<p class="home-no-products">الإكسسوارات المتوفرة تظهر هنا قريباً.</p>';
 if(d)d.innerHTML=deals.length?deals.map(p=>card(p).replace('<strong>'+money(p.price)+'</strong>','<strong>'+money(p.price)+' <del>'+money(p.oldPrice)+'</del></strong>')).join(""):'<p class="home-no-products">ماكو عروض محددة حالياً.</p>';
 document.querySelectorAll("[data-home-details]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.homeDetails)));
}
function showProductDetails(id){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return;
 const content=$("product-details-content");
 if(!content)return;
 const images=[...new Set([p.image,...(Array.isArray(p.images)?p.images:[])].filter(Boolean))];
 const specs=[
  ["الرام",p.ram],["الذاكرة الداخلية",p.storage],["المعالج",p.chipset],
  ["الشاشة",p.screen],["الكاميرات",p.camera],["البطارية والشحن",p.battery],
  ["مقاومة الماء والغبار",p.protection],["اللون",p.color]
 ].filter(x=>x[1]);
 const related=products.filter(x=>String(x.id)!==String(p.id)&&((p.brand&&x.brand===p.brand)||(p.categoryId&&String(x.categoryId)===String(p.categoryId)))).slice(0,4);
 const gallery=images.length?'<div class="landing-gallery"><div class="landing-main-image"><img id="landing-main-image" src="'+escapeHtml(images[0])+'" alt="'+escapeHtml(p.name)+'"></div>'+(images.length>1?'<div class="landing-thumbs">'+images.map((src,i)=>'<button type="button" class="landing-thumb '+(i===0?'active':'')+'" data-gallery-image="'+i+'" aria-label="الصورة '+(i+1)+'"><img src="'+escapeHtml(src)+'" alt=""></button>').join('')+'</div>':'')+'</div>':'<div class="landing-gallery"><div class="landing-main-image landing-no-image">صورة المنتج غير متوفرة حالياً</div></div>';
 content.innerHTML=
 '<div class="product-landing">'+
  '<div class="landing-topline"><span class="eyebrow">HONOR AL-DIWANIYAH</span><span class="landing-stock '+(p.stock>0?'available':'unavailable')+'">'+(p.stock>0?'متوفر حالياً':'غير متوفر حالياً')+'</span></div>'+
  '<div class="landing-overview">'+gallery+
   '<div class="landing-buy-panel"><span class="landing-brand">'+escapeHtml(p.brand||p.category||"متجر هونر الديوانية")+'</span>'+
    '<h1>'+escapeHtml(p.name)+'</h1>'+
    '<div class="landing-memory">'+[p.ram,p.storage].filter(Boolean).map(escapeHtml).join(' · ')+'</div>'+
    '<div class="landing-price-line"><strong>'+money(p.price)+'</strong>'+(p.oldPrice>p.price?'<del>'+money(p.oldPrice)+'</del>':'')+'</div>'+
    (p.description?'<p class="landing-description">'+escapeHtml(p.description)+'</p>':'')+
    '<div class="landing-actions"><button type="button" class="landing-share-btn" id="detail-share">مشاركة المنتج</button><button type="button" class="primary-btn" id="detail-order-now" '+(p.stock<=0?'disabled':'')+'>اطلب الآن</button><button type="button" class="landing-cart-btn" id="detail-add-cart" '+(p.stock<=0?'disabled':'')+'>أضف للسلة</button><a class="landing-whatsapp-btn" href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent("أريد الاستفسار عن "+p.name+" بسعر "+money(p.price))+'" target="_blank" rel="noopener">استفسر عبر واتساب ↗</a></div>'+
    '<p class="landing-delivery-note">توصيل لجميع محافظات العراق · تواصل ويانه لأي استفسار</p>'+
   '</div>'+
  '</div>'+
  '<section class="landing-section"><div class="landing-section-title"><span>01 / SPECIFICATIONS</span><h2>المواصفات التقنية</h2><p>المعلومات المعروضة هي المواصفات المسجلة لهذا المنتج في المتجر.</p></div>'+
   (specs.length?'<div class="landing-spec-grid">'+specs.map((s,i)=>'<article class="landing-spec"><small>'+String(i+1).padStart(2,'0')+'</small><span>'+escapeHtml(s[0])+'</span><b>'+escapeHtml(s[1])+'</b></article>').join('')+'</div>':'<p class="landing-empty-specs">المواصفات التفصيلية غير مضافة لهذا المنتج حالياً.</p>')+
  '</section>'+
  '<section class="landing-benefits"><article><b>توصيل لكل العراق</b><span>نوصل طلبك إلى محافظتك</span></article><article><b>متابعة الطلب</b><span>نتابع وياك من الطلب للاستلام</span></article><article><b>خدمة ما بعد البيع</b><span>متواجدين للمساعدة والاستفسار</span></article></section>'+
  '<section class="landing-section landing-faq"><div class="landing-section-title"><span>02 / BEFORE YOU ORDER</span><h2>قبل لا تطلب</h2></div>'+
   '<details><summary>شلون أطلب الجهاز؟</summary><p>اضغط «اطلب الآن» وكمل معلومات التوصيل حتى يوصلنا طلبك.</p></details>'+
   '<details><summary>هل التوصيل متوفر خارج الديوانية؟</summary><p>نوفّر التوصيل لجميع محافظات العراق.</p></details>'+
   '<details><summary>أكدر أتأكد من تفاصيل النسخة قبل الطلب؟</summary><p>إي، تواصل ويانه حتى نأكدلك تفاصيل النسخة والتوفر قبل إكمال الطلب.</p></details>'+
  '</section>'+
  (related.length?'<section class="landing-section"><div class="landing-section-title"><span>03 / YOU MAY ALSO LIKE</span><h2>منتجات مشابهة</h2></div><div class="landing-related">'+related.map(x=>'<button type="button" class="landing-related-card" data-related-product="'+escapeHtml(x.id)+'">'+(x.image?'<img src="'+escapeHtml(x.image)+'" alt="'+escapeHtml(x.name)+'">':'<span class="landing-related-placeholder">HONOR AL-DIWANIYAH</span>')+'<b>'+escapeHtml(x.name)+'</b><strong>'+money(x.price)+'</strong></button>').join('')+'</div></section>':'')+
  '<div class="landing-bottom-cta"><div><b>جاهز تطلب '+escapeHtml(p.name)+'؟</b><span>اختار اطلب الآن حتى نكمل طلبك.</span></div><button type="button" class="primary-btn" id="detail-order-bottom" '+(p.stock<=0?'disabled':'')+'>اطلب الآن</button></div>'+
 '</div>';
 const mainImage=$("landing-main-image");
 document.querySelectorAll("[data-gallery-image]").forEach(b=>b.addEventListener("click",()=>{
  const index=Number(b.dataset.galleryImage);
  if(mainImage&&images[index])mainImage.src=images[index];
  document.querySelectorAll(".landing-thumb").forEach(x=>x.classList.toggle("active",x===b));
 }));
 $("detail-share")?.addEventListener("click",async()=>{const url=location.origin+"/#product/"+encodeURIComponent(p.id);try{if(navigator.share)await navigator.share({title:p.name,text:"شوف "+p.name+" من HONOR AL-DIWANIYAH",url});else{await navigator.clipboard.writeText(url);toast("تم نسخ رابط المنتج")}}catch(err){if(err?.name!=="AbortError"){try{await navigator.clipboard.writeText(url);toast("تم نسخ رابط المنتج")}catch{toast("ما قدرنا نشارك الرابط")}}}});
 const orderNow=()=>{if(p.stock<=0)return;addToCart(p.id);$("checkout-dialog").showModal()};
 ["detail-order-now","detail-order-bottom"].forEach(id=>$(id)?.addEventListener("click",orderNow));
 $("detail-add-cart")?.addEventListener("click",()=>addToCart(p.id));
 document.querySelectorAll("[data-related-product]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.relatedProduct)));
 showStorePage("product-detail",{push:false});
 if(!location.hash.startsWith("#product/"))history.pushState({productId:id},"","#product/"+encodeURIComponent(id));
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
 const cartCount=cart.reduce((a,x)=>a+x.qty,0);
 $("cart-count").textContent=cartCount;
 if($("mobile-cart-count")) $("mobile-cart-count").textContent=cartCount;
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
 const paths={
   all:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
   tablet:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
   phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'
 };
 const type=slug.includes("tablet")||name.includes("تابلت")?"tablet":"phone";
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(type==="tablet"?paths.tablet:paths.phone)+'</svg>';
}
function renderCategories(categories){
 storeCategories=categories||[];
 const brandSelect=$("brand-filter");
 if(!brandSelect)return;
 const brands=[...new Set(products.map(p=>String(p.brand||"").trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"ar"));
 const previous=selectedBrand;
 brandSelect.innerHTML='<option value="الكل">كل البراندات</option>'+brands.map(b=>'<option value="'+escapeHtml(b)+'">'+escapeHtml(b)+'</option>').join("");
 selectedBrand=brands.includes(previous)?previous:"الكل";
 brandSelect.value=selectedBrand;
}
async function loadProducts(){
 if(!hasBackend){
   products=[...demoProducts];
   renderProducts();
    await loadHomeBanner();
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
     sb.from("products").select("id,category_id,name,description,price,old_price,stock,image_url,images,brand,ram,storage,color,chipset,screen,camera,battery,protection,is_featured,is_active,created_at").eq("is_active",true).order("created_at",{ascending:false})
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
       categorySlug:category?.slug||"",
       deviceType:category?.slug==="tablets"?"tablet":category?.slug==="accessories"?"accessories":category?.slug==="maintenance"?"maintenance":"phone",
       description:row.description||row.brand||category?.name||"",
       price:Number(row.price)||0,
       oldPrice:Number(row.old_price)||0,
       stock:Number(row.stock)||0,
       image:row.image_url||"",
       images:Array.isArray(row.images)?row.images:[],
       brand:row.brand||(category&&!["tablets","accessories","maintenance"].includes(category.slug)?category.name:""),
       ram:row.ram||(isX9d?"12GB":""),
       storage:row.storage||(isX9d?"256GB":""),
       color:row.color||"",
       chipset:row.chipset||"",
       screen:row.screen||"",
       camera:row.camera||"",
       battery:row.battery||"",
       protection:row.protection||"",
       tag:row.is_featured?"اختيار مميز":"",isFeatured:!!row.is_featured,createdAt:row.created_at||""
     };
   });
   cart=cart.map(item=>{const current=products.find(p=>String(p.id)===String(item.id));return current?{...item,name:current.name,price:current.price}:item;});
   localStorage.setItem("honor-cart",JSON.stringify(cart));
   renderCart();
   if(categoryError){
     console.error("Supabase categories load failed:",categoryError);
     renderCategories([]);
     productLoadMessage="تم تحميل المنتجات، لكن تعذّر تحميل الأقسام. راجع صلاحيات قراءة جدول categories.";
   }else{
     renderCategories(categories||[]);
     productLoadMessage="";
   }
   renderProducts();
   await loadHomeBanner();
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
 await loadProducts();
 e.currentTarget.reset();
 setTimeout(()=>$("checkout-dialog").close(),3000);
}

// Theme preference: light by default, with a user-controlled dark mode.
const savedTheme=localStorage.getItem("honor-store-theme");
document.body.classList.toggle("theme-dark",savedTheme==="dark");
document.body.classList.toggle("theme-light",savedTheme!=="dark");
function updateThemeToggle(){
 const dark=document.body.classList.contains("theme-dark");
 const btn=$("theme-toggle");
 if(!btn)return;
 btn.querySelector(".theme-toggle-icon").textContent=dark?"☀":"☾";
 btn.querySelector(".theme-toggle-label").textContent=dark?"الوضع الساطع":"الوضع الداكن";
 btn.setAttribute("aria-label",dark?"تفعيل الوضع الساطع":"تفعيل الوضع الداكن");
}
updateThemeToggle();
$("theme-toggle").addEventListener("click",()=>{
 const dark=!document.body.classList.contains("theme-dark");
 document.body.classList.toggle("theme-dark",dark);
 document.body.classList.toggle("theme-light",!dark);
 localStorage.setItem("honor-store-theme",dark?"dark":"light");
 updateThemeToggle();
});

// Category buttons are rendered dynamically from Supabase categories.
$("search-input").addEventListener("input",()=>{if($("products-search-input"))$("products-search-input").value=$("search-input").value;visibleProductCount=productsPerPage;renderProducts()});
if($("products-search-input"))$("products-search-input").addEventListener("input",()=>{$("search-input").value=$("products-search-input").value;visibleProductCount=productsPerPage;renderProducts()});
if($("availability-filter"))$("availability-filter").addEventListener("change",e=>{selectedAvailability=e.target.value;visibleProductCount=productsPerPage;renderProducts()});
$("search-input").addEventListener("keydown",e=>{if(e.key==="Enter"){visibleProductCount=productsPerPage;renderProducts();showStorePage("products")}});

$("brand-filter").addEventListener("change",e=>{selectedBrand=e.target.value;visibleProductCount=productsPerPage;renderProducts()});
$("device-type-filter").addEventListener("change",e=>{selectedDeviceType=e.target.value;visibleProductCount=productsPerPage;renderProducts()});
if($("load-more-products")) $("load-more-products").addEventListener("click",()=>{visibleProductCount+=productsPerPage;renderProducts()});
$("search-toggle").onclick=()=>{showStorePage("products");setTimeout(()=>$("products-search-input")?.focus(),80)};
$("search-clear").onclick=()=>{$("search-input").value="";if($("products-search-input"))$("products-search-input").value="";renderProducts()};
$("cart-open").onclick=openCart;
if($("mobile-cart-open")) $("mobile-cart-open").onclick=openCart;
$("cart-close").onclick=closeCart;
$("overlay").onclick=closeCart;
$("checkout-open").onclick=()=>{if(!cart.length)return toast("السلة فارغة");closeCart();$("checkout-dialog").showModal()};
$("checkout-close").onclick=()=>$("checkout-dialog").close();
$("product-details-back").onclick=()=>{history.pushState({storePage:"products"},"","#products");showStorePage("products",{push:false})};
$("checkout-form").addEventListener("submit",submitOrder);

$("order-tracking-form")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const form=new FormData(e.currentTarget),number=Number(form.get("order_number")),phone=String(form.get("phone")||"").trim(),box=$("order-tracking-result");
 box.innerHTML='<p class="tracking-loading">جارٍ البحث عن طلبك...</p>';
 if(!sb){box.textContent="خدمة تتبع الطلب غير متاحة حالياً.";return}
 try{
  const {data,error}=await sb.rpc("track_store_order",{p_order_number:number,p_phone:phone});
  if(error)throw error;
  if(!data){box.innerHTML='<div class="tracking-not-found"><b>ما لكينا طلب مطابق.</b><span>تأكد من رقم الطلب ورقم الهاتف المسجل عند الشراء.</span></div>';return}
  const labels={new:"تم استلام الطلب",confirmed:"تم تأكيد الطلب",processing:"قيد التجهيز",shipped:"تم شحن الطلب",delivered:"تم تسليم الطلب",cancelled:"الطلب ملغي"};
  const orderSteps=["new","confirmed","processing","shipped","delivered"],idx=orderSteps.indexOf(data.status);
  const steps=orderSteps.map((s,i)=>'<div class="tracking-step '+(i<=idx&&data.status!=="cancelled"?"done":"")+'"><i></i><span>'+({new:"استلام الطلب",confirmed:"تأكيد الطلب",processing:"التجهيز",shipped:"الشحن",delivered:"التسليم"}[s])+'</span></div>').join("");
  box.innerHTML='<article class="tracking-card"><div class="tracking-card-head"><span>الطلب #'+data.order_number+'</span><b class="'+(data.status==="cancelled"?"cancelled":"")+'">'+(labels[data.status]||data.status)+'</b></div>'+(data.status==="cancelled"?'<p>تم إلغاء هذا الطلب.</p>':'<div class="tracking-steps">'+steps+'</div>')+'<div class="tracking-meta"><span>تاريخ الطلب <b>'+new Date(data.created_at).toLocaleString("ar-IQ")+'</b></span><span>آخر تحديث <b>'+new Date(data.updated_at).toLocaleString("ar-IQ")+'</b></span><span>المجموع <b>'+money(data.total)+'</b></span></div><div class="tracking-items"><b>محتويات الطلب</b>'+(data.items||[]).map(x=>'<p>'+escapeHtml(x.product_name)+' × '+Number(x.quantity)+'</p>').join("")+'</div></article>';
 }catch(err){console.error(err);box.textContent="تعذر جلب حالة الطلب حالياً. حاول مرة ثانية."}
});

$("menu-toggle").onclick=()=>document.querySelector(".desktop-nav").classList.toggle("mobile-open");

function renderFavorites(){const section=$("home-favorites-section"),grid=$("home-favorites-grid");if(!section||!grid)return;const rows=favoriteIds.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);section.classList.toggle("hidden",!rows.length);grid.innerHTML=rows.map(p=>'<article class="home-product-card"><button type="button" class="home-product-open" data-home-details="'+escapeHtml(p.id)+'"><div class="home-product-image">'+(p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'">':'<span>HONOR AL-DIWANIYAH</span>')+'</div><b>'+escapeHtml(p.name)+'</b><strong>'+money(p.price)+'</strong></button></article>').join("");}
function renderCompareDock(){const d=$("compare-dock");if(!d)return;d.classList.toggle("hidden",!compareIds.length);$("compare-count").textContent=compareIds.length;}
function renderCompare(){const rows=compareIds.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);const fields=[["السعر",p=>money(p.price)],["الماركة",p=>p.brand||"—"],["الرام",p=>p.ram||"—"],["الذاكرة",p=>p.storage||"—"],["الشاشة",p=>p.screen||"—"],["المعالج",p=>p.chipset||"—"],["الكاميرات",p=>p.camera||"—"],["البطارية",p=>p.battery||"—"],["التوفر",p=>p.stock>0?"متوفر":"نفذت الكمية"]];$("compare-content").innerHTML=rows.length?'<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>المواصفة</th>'+rows.map(p=>'<th>'+escapeHtml(p.name)+'</th>').join("")+'</tr></thead><tbody>'+fields.map(f=>'<tr><th>'+f[0]+'</th>'+rows.map(p=>'<td>'+escapeHtml(f[1](p))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':'<p>أضف أجهزة للمقارنة.</p>';}
document.addEventListener("click",e=>{const f=e.target.closest("[data-favorite]"),c=e.target.closest("[data-compare]");if(f){e.preventDefault();e.stopPropagation();const id=String(f.dataset.favorite);favoriteIds=favoriteIds.includes(id)?favoriteIds.filter(x=>x!==id):favoriteIds.concat(id);localStorage.setItem("honor-favorites",JSON.stringify(favoriteIds));renderProducts();renderFavorites();toast(favoriteIds.includes(id)?"انضاف للمفضلة":"انحذف من المفضلة");}if(c){e.preventDefault();e.stopPropagation();const id=String(c.dataset.compare);if(compareIds.includes(id)){toast("هذا المنتج موجود بالمقارنة");return;}if(compareIds.length>=3){toast("تقدر تقارن 3 أجهزة كحد أقصى");return;}compareIds.push(id);localStorage.setItem("honor-compare",JSON.stringify(compareIds));renderCompareDock();toast("انضاف للمقارنة");}});
$("compare-open")?.addEventListener("click",()=>{renderCompare();$("compare-dialog").showModal();});
$("compare-close")?.addEventListener("click",()=>$("compare-dialog").close());
$("compare-clear")?.addEventListener("click",()=>{compareIds=[];localStorage.setItem("honor-compare","[]");renderCompareDock();});

$("home-deals-more")?.addEventListener("click",()=>{selectedDeviceType="الكل";$("device-type-filter").value="الكل";selectedBrand="الكل";$("brand-filter").value="الكل";selectedAvailability="available";$("availability-filter").value="available";$("products-search-input").value="";visibleProductCount=productsPerPage;renderProducts();showStorePage("products");});
function showStorePage(page,{push=true}={}){
 const allowed=["home","departments","products","accessories","maintenance","product-detail","tracking"];
 if(!allowed.includes(page))page="home";
 document.querySelectorAll("[data-page-view]").forEach(view=>view.classList.toggle("active",view.dataset.pageView===page));
 document.querySelectorAll("[data-page]").forEach(link=>{
   const active=link.dataset.page===page;
   link.classList.toggle("active",active);
   if(link.classList.contains("mobile-nav-item"))link.setAttribute("aria-current",active?"page":"false");
 });
 document.querySelector(".desktop-nav")?.classList.remove("mobile-open");
 if(push)history.pushState({storePage:page},"","#"+page);
 window.scrollTo({top:0,behavior:"instant"});
}
document.querySelectorAll("[data-page]").forEach(link=>link.addEventListener("click",e=>{
 e.preventDefault();
 if(link.dataset.deviceType){
   selectedDeviceType=link.dataset.deviceType;
   $("device-type-filter").value=selectedDeviceType;
   selectedBrand="الكل";
   $("brand-filter").value="الكل";
   visibleProductCount=productsPerPage;
   renderProducts();
 }
 showStorePage(link.dataset.page);
}));
document.querySelectorAll("[data-device-type]").forEach(card=>card.addEventListener("click",()=>{
 selectedDeviceType=card.dataset.deviceType;
 $("device-type-filter").value=selectedDeviceType;
 selectedBrand="الكل";$("brand-filter").value="الكل";
 visibleProductCount=productsPerPage;renderProducts();showStorePage("products");
}));
document.querySelectorAll("[data-home-filter]").forEach(btn=>btn.addEventListener("click",()=>{
 selectedDeviceType=btn.dataset.homeFilter;
 $("device-type-filter").value=selectedDeviceType;
 selectedBrand="الكل";$("brand-filter").value="الكل";
 selectedAvailability="all";$("availability-filter").value="all";
 $("products-search-input").value="";
 visibleProductCount=productsPerPage;
 renderProducts();showStorePage("products");
}));
document.querySelectorAll("[data-shop-accessories]").forEach(btn=>btn.addEventListener("click",()=>{
 selectedDeviceType="accessories";$("device-type-filter").value="accessories";
 selectedBrand="الكل";$("brand-filter").value="الكل";
 visibleProductCount=productsPerPage;renderProducts();showStorePage("products");
}));
function handleStoreLocationA(){
 const hash=location.hash.replace(/^#/,"");
 if(hash.startsWith("product/")){
  const id=decodeURIComponent(hash.slice(8));
  showProductDetails(id);
  return;
 }
 const page=hash||"home";
 showStorePage(page,{push:false});
}
window.addEventListener("popstate",handleStoreLocationA);
const initialHash=location.hash.replace(/^#/,"");
if(!initialHash.startsWith("product/"))showStorePage(initialHash||"home",{push:false});
$("year").textContent=new Date().getFullYear();
initGovernors();
renderProducts();
renderCart();
loadProducts().then(()=>{renderFavorites();renderCompareDock();if(location.hash.startsWith("#product/"))handleStoreLocationA()});


/* Admin dashboard: open with ?admin=1 */
(function(){
 if(new URLSearchParams(location.search).get("admin")!=="1")return;
 const $a=id=>document.getElementById(id),escA=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const moneyA=n=>new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
 const cfgA=window.STORE_CONFIG||{},dbA=window.supabase?.createClient&&cfgA.supabaseUrl&&cfgA.supabaseAnonKey?window.supabase.createClient(cfgA.supabaseUrl,cfgA.supabaseAnonKey):null;
 let profA=null,prodA=[],catA=[],ordA=[],productImageItemsA=[];
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
 function setAdminTabA(name){document.querySelectorAll(".admin-pane").forEach(x=>x.classList.add("hidden"));$a("admin-"+name).classList.remove("hidden");document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x.dataset.adminTab===name));const labels={overview:"نظرة عامة",products:"المنتجات",categories:"الأقسام",orders:"الطلبات"};$a("admin-current-section").textContent=labels[name]||"لوحة التحكم";$a("admin-welcome-title").textContent=(name==="overview"?"مرحباً بك 👋":labels[name]);}
 document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>setAdminTabA(b.dataset.adminTab));
 $a("admin-refresh").onclick=()=>loadA();
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
  const activeProducts=prodA.filter(p=>p.is_active),activeCats=catA.filter(c=>c.is_active),newOrders=ordA.filter(o=>o.status==="new");
  $a("admin-stat-products").textContent=activeProducts.length;$a("admin-stat-categories").textContent=activeCats.length;$a("admin-stat-orders").textContent=newOrders.length;$a("admin-stat-sales").textContent=moneyA(ordA.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0));
  $a("admin-nav-new-orders").textContent=newOrders.length;$a("admin-user-name").textContent=profA?.full_name||"مدير المتجر";$a("admin-user-role").textContent=({owner:"مالك المتجر",admin:"مدير",staff:"موظف"})[profA?.role]||"إدارة المتجر";
  const statuses=[["new","جديدة","#16aaa2"],["confirmed","مؤكدة","#7c68d8"],["processing","قيد التجهيز","#d18b27"],["shipped","تم الشحن","#278f9a"],["delivered","مكتملة","#29966d"],["cancelled","ملغاة","#a0a7b2"]];
  $a("admin-order-status-summary").innerHTML=statuses.map(([key,label,color])=>'<div class="admin-status-row"><span class="admin-status-dot" style="--status-color:'+color+'"></span><span>'+label+'</span><b>'+ordA.filter(o=>o.status===key).length+'</b></div>').join("");
  const low=activeProducts.filter(p=>Number(p.stock)<=3).sort((a,b)=>Number(a.stock)-Number(b.stock)).slice(0,6);
  $a("admin-stock-alerts").innerHTML=low.length?low.map(p=>'<div class="admin-stock-row"><span class="admin-stock-state '+(Number(p.stock)===0?'is-zero':'is-low')+'">'+(Number(p.stock)===0?'نفد':'قليل')+'</span><b>'+escA(p.name)+'</b><small>'+Number(p.stock)+' متبقي</small></div>').join(""):'<div class="admin-empty">المخزون جيد حالياً، ماكو تنبيهات.</div>';
  $a("admin-recent-orders").innerHTML=orderTableA(ordA.slice(0,6));
  renderProdA();renderCatA();renderOrdA();
 }
 function renderProdA(){
  const q=($a("admin-product-search").value||"").toLowerCase(),rows=prodA.filter(p=>(p.name+" "+(p.brand||"")+" "+(p.sku||"")).toLowerCase().includes(q));
  $a("admin-product-count").textContent=rows.length+" منتج";
  $a("admin-products-list").innerHTML=rows.length?'<div class="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>الصور</th><th>السعر</th><th>السعر السابق</th><th>المخزون</th><th>الحالة</th><th></th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+escA(p.name)+'<br><small>'+escA(p.brand||"")+' '+escA(p.ram||"")+' '+escA(p.storage||"")+'</small></td><td>'+(p.image_url?"<span class='admin-pill'>صورة مضافة</span>":"<span class='admin-pill'>بدون صورة</span>")+'</td><td>'+moneyA(p.price)+'</td><td>'+moneyA(p.old_price)+'</td><td>'+p.stock+'</td><td>'+ (p.is_active?"ظاهر":"مخفي")+'</td><td><button class="admin-mini" data-admin-edit="'+p.id+'">تعديل</button><button class="admin-mini" data-admin-toggle="'+p.id+'">'+(p.is_active?"إخفاء":"إظهار")+'</button></td></tr>').join("")+'</tbody></table></div>':'<div class="admin-empty">ماكو منتجات.</div>';
  $a("admin-product-category").innerHTML='<option value="">بدون قسم</option>'+catA.map(c=>'<option value="'+c.id+'">'+escA(c.name)+'</option>').join("");
 }
 function renderCatA(){$a("admin-categories-list").innerHTML=catA.map(c=>'<div class="category-item"><div><b>'+escA(c.name)+'</b><small>'+escA(c.slug)+' · '+(c.is_active?"فعال":"مخفي")+'</small></div><button class="admin-mini" data-admin-cat-toggle="'+c.id+'">'+(c.is_active?"إخفاء":"إظهار")+'</button></div>').join("")||'<div class="admin-empty">ماكو أقسام.</div>'}
 function renderOrdA(){const f=$a("admin-order-filter").value,rows=f==="all"?ordA:ordA.filter(o=>o.status===f);$a("admin-orders-list").innerHTML=orderTableA(rows)}
 $a("admin-product-search").oninput=renderProdA;$a("admin-order-filter").onchange=renderOrdA;
 function renderProductImagePreviewA(){const box=$a("admin-product-image-preview");if(!box)return;box.innerHTML=productImageItemsA.map((item,i)=>'<div class="admin-image-thumb"><img src="'+escA(item.url||item.preview)+'" alt="صورة المنتج"><button type="button" data-remove-product-image="'+i+'" aria-label="حذف الصورة">×</button>'+(i===0?'<small>رئيسية</small>':'')+'</div>').join("")||'<div class="admin-image-empty">لم تتم إضافة صور بعد</div>'}
$a("admin-product-image-files").addEventListener("change",e=>{const files=Array.from(e.target.files||[]);for(const file of files){if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type)){toastA("صيغة الصورة غير مدعومة");continue}if(file.size>8*1024*1024){toastA("حجم الصورة يتجاوز 8MB");continue}if(productImageItemsA.length>=8){toastA("الحد الأقصى 8 صور للمنتج");break}productImageItemsA.push({file,preview:URL.createObjectURL(file)})}e.target.value="";renderProductImagePreviewA()});
$a("admin-product-image-preview").addEventListener("click",e=>{const b=e.target.closest("[data-remove-product-image]");if(!b)return;const item=productImageItemsA.splice(Number(b.dataset.removeProductImage),1)[0];if(item?.preview)URL.revokeObjectURL(item.preview);renderProductImagePreviewA()});
$a("admin-add-product").onclick=()=>openProdA();function openProdA(id){const f=$a("admin-product-form");f.reset();f.elements.id.value="";f.elements.is_active.checked=true;if(f.elements.is_featured)f.elements.is_featured.checked=false;productImageItemsA=[];if(id){const p=prodA.find(x=>x.id===id);Object.keys(p).forEach(k=>{if(f.elements[k]&&k!=="images")f.elements[k].value=p[k]??""});const urls=[p.image_url,...(Array.isArray(p.images)?p.images:[])].filter(Boolean);productImageItemsA=urls.map(url=>({url}));f.elements.is_active.checked=!!p.is_active;if(f.elements.is_featured)f.elements.is_featured.checked=!!p.is_featured}renderProductImagePreviewA();$a("admin-product-dialog").showModal()}
 $a("admin-products-list").addEventListener("click",async e=>{const edit=e.target.closest("[data-admin-edit]"),toggle=e.target.closest("[data-admin-toggle]");if(edit)openProdA(edit.dataset.adminEdit);if(toggle){const p=prodA.find(x=>x.id===toggle.dataset.adminToggle);const {error}=await dbA.from("products").update({is_active:!p.is_active}).eq("id",p.id);if(error){toastA(error.message);return}await loadA()}});
 $a("admin-product-form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f)),submit=f.querySelector('button[type="submit"],button:not([type])');if(submit){submit.disabled=true;submit.textContent="جارٍ رفع الصور والحفظ..."}const uploadedPaths=[];try{const finalUrls=[];for(let i=0;i<productImageItemsA.length;i++){const item=productImageItemsA[i];if(item.url){finalUrls.push(item.url);continue}const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[item.file.type]||"jpg";const path="products/"+Date.now()+"-"+Math.random().toString(36).slice(2,10)+"-"+i+"."+ext;const {error:uploadError}=await dbA.storage.from("product-images").upload(path,item.file,{contentType:item.file.type,cacheControl:"31536000",upsert:false});if(uploadError)throw uploadError;uploadedPaths.push(path);finalUrls.push(dbA.storage.from("product-images").getPublicUrl(path).data.publicUrl)}const payload={name:d.name,brand:d.brand||null,category_id:d.category_id||null,price:Number(d.price),old_price:d.old_price?Number(d.old_price):null,stock:Number(d.stock||0),ram:d.ram||null,storage:d.storage||null,color:d.color||null,sku:d.sku||null,image_url:finalUrls[0]||null,images:finalUrls.slice(1),chipset:d.chipset||null,screen:d.screen||null,camera:d.camera||null,battery:d.battery||null,protection:d.protection||null,description:d.description||null,is_active:f.elements.is_active.checked,is_featured:!!f.elements.is_featured?.checked};const q=d.id?dbA.from("products").update(payload).eq("id",d.id):dbA.from("products").insert(payload);const {error}=await q;if(error)throw error;$a("admin-product-dialog").close();toastA("تم حفظ المنتج وصوره بنجاح");productImageItemsA=[];await loadA()}catch(error){if(uploadedPaths.length)await dbA.storage.from("product-images").remove(uploadedPaths);toastA("تعذر الحفظ: "+(error.message||"تحقق من الاتصال والصلاحيات"))}finally{if(submit){submit.disabled=false;submit.textContent="حفظ"}}};
 $a("admin-add-category").onclick=()=>$a("admin-category-dialog").showModal();
 $a("admin-category-form").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const {error}=await dbA.from("categories").insert({name:d.name.trim(),slug:d.slug.trim().toLowerCase(),is_active:true});if(error){toastA("تعذرت إضافة القسم: "+error.message);return}$a("admin-category-dialog").close();toastA("تمت إضافة القسم");await loadA()};
 $a("admin-categories-list").addEventListener("click",async e=>{const b=e.target.closest("[data-admin-cat-toggle]");if(!b)return;const c=catA.find(x=>x.id===b.dataset.adminCatToggle);const {error}=await dbA.from("categories").update({is_active:!c.is_active}).eq("id",c.id);if(error){toastA(error.message);return}await loadA()});
 async function orderDetailA(id){const o=ordA.find(x=>x.id===id);if(!o)return;const items=o.order_items||[];const summary="الطلب #"+(o.order_number||o.id.slice(0,8))+"\\nالزبون: "+o.customer_name+"\\nالهاتف: "+o.phone+"\\nالعنوان: "+(o.province||"")+" - "+(o.district||"")+"\\n"+(o.address||"")+"\\n\\nالمنتجات:\\n"+items.map(i=>i.product_name+" × "+i.quantity+" — "+moneyA(i.line_total)).join("\\n")+"\\n\\nالمجموع: "+moneyA(o.total)+"\\nالحالة الحالية: "+statusA(o.status);alert(summary);const status=prompt("اكتب الحالة الجديدة: new / confirmed / processing / shipped / delivered / cancelled",o.status);if(status===null)return;if(!["new","confirmed","processing","shipped","delivered","cancelled"].includes(status)){toastA("الحالة غير صحيحة");return}const {error}=await dbA.rpc("admin_update_order_status",{p_order_id:id,p_status:status});if(error){toastA("تعذر تحديث الطلب: "+error.message);return}toastA("تم تحديث الطلب والمخزون");await loadA()}
 document.addEventListener("click",e=>{const b=e.target.closest("[data-admin-order]");if(b)orderDetailA(b.dataset.adminOrder)});
 authA();
})();
