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
function readStoreList(key){try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[]}catch{return []}}
let cart = readStoreList("honor-cart");
let favoriteIds = readStoreList("honor-favorites");
let compareIds = readStoreList("honor-compare");
let deliveryRates = [];
let selectedBrand = "الكل";
let selectedDeviceType = "الكل";
let visibleProductCount = 8;
const productsPerPage = 8;
let selectedAvailability = "all";
let catalogSort = "featured";
const WHATSAPP_NUMBER = "9647874400300";

let storeBundles=[];
async function loadStoreBundles(){
 if(!sb)return;
 try{
  const {data,error}=await sb.from("store_bundles").select("id,title,description,image_url,bundle_price,store_bundle_items(quantity,products(name))").eq("is_active",true).order("created_at",{ascending:false}).limit(8);
  if(error)throw error;storeBundles=data||[];
  const box=$("home-bundles-grid"),section=$("home-bundles-section");if(!box||!section)return;
  section.classList.toggle("hidden",!storeBundles.length);
  box.innerHTML=storeBundles.map(b=>'<article class="home-product-card bundle-card">'+(b.image_url?'<div class="home-product-image"><img src="'+escapeHtml(b.image_url)+'" alt="'+escapeHtml(b.title)+'"></div>':'<div class="home-product-image"><span>HONOR AL-DIWANIYAH</span></div>')+'<small>باقة متكاملة</small><b>'+escapeHtml(b.title)+'</b><p>'+escapeHtml(b.description||"")+'</p><strong>'+money(b.bundle_price)+'</strong><button type="button" class="add-btn" data-bundle-inquiry="'+escapeHtml(b.id)+'">استفسر عن الباقة</button></article>').join("");
 }catch(e){console.warn("Bundles unavailable",e)}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-bundle-inquiry]");if(!b)return;const x=storeBundles.find(v=>String(v.id)===b.dataset.bundleInquiry);if(!x)return;const msg="أريد الاستفسار عن باقة "+x.title+" بسعر "+money(x.bundle_price);window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(msg),"_blank","noopener")});

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
function safeBannerLink(value=""){
 const raw=String(value||"#products").trim();
 if(raw.startsWith("#")||raw.startsWith("/"))return raw;
 try{const u=new URL(raw,window.location.origin);return (u.protocol==="https:"||u.protocol==="http:")?u.href:"#products"}catch{return "#products"}
}
function escapeHtml(s=""){
 return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function stockState(p,stock=p.stock){const n=Math.max(0,Number(stock)||0),limit=Math.max(1,Number(p.lowStockThreshold)||3);return n<=0?'out':n<=limit?'low':'in'}
function stockLabel(s){return s==='out'?'غير متوفر':s==='low'?'كمية محدودة':'متوفر'}
function stockClass(s){return s==='out'?'out-stock':s==='low'?'low-stock':'in-stock'}
function renderProducts(){
 const q=($("products-search-input")?.value||$("search-input").value).trim().toLowerCase();
 const filtered=products.filter(p=>Number(p.stock)>0).filter(p=>{
   const type=p.deviceType||"phone";
   const brand=String(p.brand||"").trim()||"بدون ماركة";
   return (selectedBrand==="الكل"||brand.toLowerCase()===selectedBrand.toLowerCase()) &&
     (selectedDeviceType==="الكل"||type===selectedDeviceType) &&
     (selectedAvailability==="all"||(selectedAvailability==="available"&&Number(p.stock)>0)||(selectedAvailability==="unavailable"&&Number(p.stock)<=0)) &&
     (`${p.name} ${p.description||""} ${p.brand||""}`).toLowerCase().includes(q);
 });
 // المتوفر أولاً، ثم نفذت الكمية مع الحفاظ على ترتيب المنتجات داخل كل مجموعة.
  const sortedProducts=[...filtered].sort((a,b)=>{const st=(Number(b.stock)>0?1:0)-(Number(a.stock)>0?1:0);if(catalogSort==="price-asc")return Number(a.price)-Number(b.price)||st;if(catalogSort==="price-desc")return Number(b.price)-Number(a.price)||st;if(catalogSort==="newest")return new Date(b.createdAt||0)-new Date(a.createdAt||0)||st;return st;});
  const visibleProducts=sortedProducts.slice(0,visibleProductCount);
 if(productLoadMessage==="جاري تحميل المنتجات..."){$("product-grid").innerHTML=Array.from({length:6},()=>`<article class="product-card product-skeleton"><div class="skeleton-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-line price"></div></article>`).join("");}
 else $("product-grid").innerHTML=visibleProducts.map(p=>`<article class="product-card">
   ${p.tag?`<span class="product-tag">${escapeHtml(p.tag)}</span>`:""}
   <button type="button" class="product-view" data-details="${escapeHtml(p.id)}" aria-label="تفاصيل ${escapeHtml(p.name)}">
     <div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">`:`<div class="product-placeholder"><span>${escapeHtml(p.brand||"TECH")}</span><b>${escapeHtml(p.name)}</b><small>HONOR AL-DIWANIYAH</small></div>`}</div>
     <div class="product-card-copy">
       <span class="product-brand">${escapeHtml(p.brand||p.category||"")}</span>
       <h3>${escapeHtml(p.name)}</h3>
       <div class="product-meta">${p.variants?.length>1?"خيارات متعددة · "+p.variants.length+" نسخ":[p.ram,p.storage].filter(Boolean).map(escapeHtml).join(" · ")||escapeHtml(p.description||p.category||"")}</div>
       <div class="product-price-row"><b class="price">${money(p.price)}</b>${p.oldPrice>p.price?`<del class="old-price">${money(p.oldPrice)}</del>`:""}</div><small class="product-stock-note ${stockClass(stockState(p))}">${stockLabel(stockState(p))}</small>
     </div>
   </button>
   <div class="product-bottom">${p.stock>0?`<button class="add-btn" data-add="${escapeHtml(p.id)}">أضف للسلة</button>`:`<a class="add-btn stock-inquiry" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("أريد الاستفسار عن توفر "+p.name)}" target="_blank" rel="noopener">اسأل عن التوفر</a>`}<button type="button" class="product-tool-btn favorite-tool ${favoriteIds.includes(String(p.id))?"is-favorite":""}" data-favorite="${escapeHtml(p.id)}" aria-label="${favoriteIds.includes(String(p.id))?"إزالة من المفضلة":"إضافة للمفضلة"}" title="${favoriteIds.includes(String(p.id))?"إزالة من المفضلة":"إضافة للمفضلة"}">${favoriteIds.includes(String(p.id))?"♥":"♡"}</button><button type="button" class="product-tool-btn compare-tool ${compareIds.includes(String(p.id))?"is-compared":""}" data-compare="${escapeHtml(p.id)}" aria-label="${compareIds.includes(String(p.id))?"إزالة من المقارنة":"إضافة للمقارنة"}" title="${compareIds.includes(String(p.id))?"إزالة من المقارنة":"إضافة للمقارنة"}">⇄</button></div>
 </article>`).join("");
 const empty=$("empty-state");
 empty.classList.toggle("hidden",filtered.length>0);
 if(!filtered.length && productLoadMessage) empty.textContent=productLoadMessage;
 else if(!filtered.length) empty.innerHTML="ما لقينا منتجات بهذا البحث.<br>جرّب اسم أقصر أو امسح الفلاتر.<br><button type=\"button\" class=\"empty-search-reset\" id=\"empty-search-reset\">عرض كل المنتجات</button>";
 else empty.textContent="ماكو منتجات تطابق بحثك حالياً.";
 $("empty-search-reset")?.addEventListener("click",()=>{if($("products-search-input"))$("products-search-input").value="";if($("search-input"))$("search-input").value="";selectedBrand="الكل";selectedDeviceType="الكل";selectedAvailability="all";visibleProductCount=productsPerPage;renderProducts()});
 const moreButton=$("load-more-products");
 if(moreButton){
   moreButton.classList.toggle("hidden",filtered.length<=visibleProductCount);
   moreButton.textContent=`عرض المزيد (${filtered.length-visibleProductCount})`;
 }
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{const p=products.find(x=>String(x.id)===String(b.dataset.add));if(!p)return;if((p.variants||[]).length>1){showProductDetails(p.id);toast("اختار نسخة الرام والذاكرة أولاً");return}const colors=(p.color||"").split(/[,،/|]+/).map(x=>x.trim()).filter(Boolean);if((p.deviceType==="phone"||p.deviceType==="tablet")&&colors.length>1){showProductDetails(p.id);toast("اختار لون الجهاز قبل إضافته للسلة");return}addToCart(p.id,colors[0]||"",p.variants?.[0]?.variant_key||"")}));
 document.querySelectorAll("[data-details]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.details)));
 renderHomeCollections();
 renderRecentlyViewed();
 renderFavorites();
}
async function loadHomeBanner(){
 const section=$("home-promo-banner");if(!section)return;
 try{if(!sb){section.classList.add("hidden");return}const result=await sb.from("home_banners").select("title,subtitle,price_text,image_url,button_text,link_url").eq("is_active",true).order("updated_at",{ascending:false});if(result.error)throw result.error;const data=result.data||[];if(!data.length){section.classList.add("hidden");return}
 let index=0,timer=null;const img=$("home-promo-image"),title=$("home-promo-title"),sub=$("home-promo-subtitle"),price=$("home-promo-price"),btn=$("home-promo-button"),link=$("home-promo-link");
 let dots=section.querySelector(".promo-slide-dots");if(!dots){dots=document.createElement("div");dots.className="promo-slide-dots";dots.setAttribute("aria-label","التنقل بين الأجهزة");section.appendChild(dots)}
 dots.innerHTML=data.map((_,i)=>'<button type="button" class="promo-dot" aria-label="عرض الجهاز '+(i+1)+'" data-promo-dot="'+i+'"></button>').join("");dots.querySelectorAll("[data-promo-dot]").forEach(d=>d.addEventListener("click",()=>{show(Number(d.dataset.promoDot),"next");restart()}));
 const show=(i,direction="next")=>{index=(i+data.length)%data.length;const b=data[index];section.dataset.swipeDirection=direction;section.classList.remove("promo-animate");void section.offsetWidth;img.src=b.image_url||"";img.alt=b.title||"عرض خاص";title.textContent=b.title||"";sub.textContent=b.subtitle||"";price.textContent=b.price_text||"";price.classList.toggle("hidden",!b.price_text);btn.textContent=b.button_text||"تسوّق الجهاز";link.href=safeBannerLink(b.link_url);section.classList.toggle("single-slide",data.length===1);dots.querySelectorAll(".promo-dot").forEach((d,j)=>{d.classList.toggle("active",j===index);d.setAttribute("aria-current",j===index?"true":"false")});section.classList.add("promo-animate")};
 const restart=()=>{if(timer)clearInterval(timer);if(data.length>1)timer=setInterval(()=>show(index+1,"next"),6000)};
 let touchX=0,touchY=0;section.addEventListener("touchstart",e=>{if(e.touches.length===1){touchX=e.touches[0].clientX;touchY=e.touches[0].clientY}},{passive:true});section.addEventListener("touchend",e=>{if(touchX===0)return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=touchY=0;if(data.length>1&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){show(index+(dx<0?1:-1),dx<0?"next":"prev");restart()}},{passive:true});show(0,"next");restart();section.classList.remove("hidden");
 }catch(error){console.warn("Home banner unavailable:",error);section.classList.add("hidden")}
}
function renderRecentlyViewed(){
 const ids=readStoreList("honor-recently-viewed");
 const list=ids.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean).slice(0,6);
 const sec=$("recently-viewed-section"),box=$("recently-viewed-grid");if(!sec||!box)return;
 sec.dataset.hasItems=list.length?"true":"false";
 box.innerHTML=list.map(p=>`<article class="home-product-card"><button type="button" class="home-product-open" data-recent-details="${escapeHtml(p.id)}"><div class="home-product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:"<span>HONOR AL-DIWANIYAH</span>"}</div><small>${escapeHtml(p.brand||p.category||"")}</small><b>${escapeHtml(p.name)}</b><strong>${money(p.price)}</strong></button></article>`).join("");
 sec.classList.toggle("hidden",!list.length||!$("page-home")?.classList.contains("active"));
 box.querySelectorAll("[data-recent-details]").forEach(b=>b.onclick=()=>showProductDetails(b.dataset.recentDetails));
}
function renderHomeCollections(){
 const available=products.filter(p=>p.stock>0);
 const phones=available.filter(p=>p.isFeatured&&(p.deviceType==="phone"||p.deviceType==="tablet")).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);
 const accessories=available.filter(p=>p.deviceType==="accessories").sort((a,b)=>(b.isFeatured?1:0)-(a.isFeatured?1:0)||new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);
 const deals=products.filter(p=>p.oldPrice>p.price&&p.stock>0).slice(0,4);
 const card=p=>'<article class="home-product-card"><button type="button" class="home-product-open" data-home-details="'+escapeHtml(p.id)+'"><div class="home-product-image">'+(p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'" loading="lazy">':'<span>HONOR AL-DIWANIYAH</span>')+'</div><small>'+escapeHtml(p.brand||p.category||"")+'</small><b>'+escapeHtml(p.name)+'</b><strong>'+money(p.price)+'</strong></button></article>';
 const l=$("home-latest-grid"),a=$("home-accessories-grid"),d=$("home-deals-grid");
 const latestSection=l?.closest(".home-collection-section"),accessoriesSection=a?.closest(".home-collection-section"),dealsSection=d?.closest(".home-collection-section");
 latestSection?.classList.toggle("hidden",!phones.length);
 accessoriesSection?.classList.toggle("hidden",!accessories.length);
 dealsSection?.classList.toggle("hidden",!deals.length);
 if(l)l.innerHTML=phones.map(card).join("");
 if(a)a.innerHTML=accessories.map(card).join("");
 if(d)d.innerHTML=deals.map(p=>card(p).replace('<strong>'+money(p.price)+'</strong>','<strong>'+money(p.price)+' <del>'+money(p.oldPrice)+'</del></strong>')).join("");
 document.querySelectorAll("[data-home-details]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.homeDetails)));
}

async function loadDeliveryRates(){if(!sb)return;try{const {data,error}=await sb.from("delivery_rates").select("governorate,fee,is_active,is_configured").eq("is_active",true);if(error)throw error;deliveryRates=data||[];updateCheckoutTotals()}catch(e){console.warn("Delivery rates unavailable",e)}}
function currentDeliveryFee(){const subtotal=cart.reduce((sum,x)=>sum+(Number(x.price)||0)*Number(x.qty||0),0);return 6000+Math.floor(subtotal/1000000)*2000}
function updateCheckoutTotals(){const subtotal=cart.reduce((sum,x)=>sum+(Number(x.price)||0)*Number(x.qty||0),0),fee=currentDeliveryFee();const feeEl=$("checkout-delivery-fee"),totalEl=$("checkout-total"),subEl=$("checkout-subtotal");if(feeEl)feeEl.textContent=money(fee);if(subEl)subEl.textContent=money(subtotal);if(totalEl)totalEl.textContent=money(subtotal+fee);const note=$("checkout-delivery-note");if(note)note.textContent="برايم: 6,000 د.ع لكل مليون أو أقل، وتزيد 2,000 د.ع لكل مليون إضافي. لجميع المحافظات."}
async function loadProductReviews(productId){const box=$("product-reviews-list"),section=$("product-reviews-section");if(!box||!section||!sb)return;try{const {data,error}=await sb.from("product_reviews").select("customer_name,rating,review_text,created_at").eq("product_id",productId).eq("is_approved",true).order("created_at",{ascending:false}).limit(30);if(error)throw error;const rows=data||[];if(!rows.length){section.hidden=true;return}section.hidden=false;const avg=rows.reduce((s,x)=>s+Number(x.rating),0)/rows.length;box.innerHTML='<div class="review-summary"><b>★ '+avg.toFixed(1)+'/5</b><span>'+rows.length+' تقييم منشور</span></div>'+rows.map(x=>'<article class="customer-review"><div><b>'+escapeHtml(x.customer_name)+'</b><span>'+('★'.repeat(x.rating))+'<i>'+('☆'.repeat(5-x.rating))+'</i></span></div><p>'+escapeHtml(x.review_text)+'</p><small>'+new Date(x.created_at).toLocaleDateString("ar-IQ")+'</small></article>').join("")}catch(e){console.warn("Product reviews unavailable",e);section.hidden=true}}
function bindReviewForm(productId){const form=$("product-review-form");if(!form)return;form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]'),msg=$("review-form-message"),d=new FormData(form);btn.disabled=true;msg.textContent="جارٍ إرسال التقييم...";try{const {error}=await sb.rpc("submit_product_review",{p_order_number:Number(d.get("order_number")),p_phone:String(d.get("phone")).trim(),p_product_id:productId,p_rating:Number(d.get("rating")),p_review_text:String(d.get("review_text")).trim()});if(error)throw error;msg.textContent="وصل تقييمك، وينتظر موافقة الإدارة قبل نشره.";form.reset();await loadProductReviews(productId)}catch(err){msg.textContent=err.message||"تعذر إرسال التقييم. تحقق من رقم الطلب والهاتف وأن الطلب مستلم."}finally{btn.disabled=false}}}

function showProductDetails(id){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return;
 try{let r=readStoreList("honor-recently-viewed");r=[String(id),...r.filter(x=>String(x)!==String(id))].slice(0,8);localStorage.setItem("honor-recently-viewed",JSON.stringify(r));renderRecentlyViewed();}catch{}
 const content=$("product-details-content");
 if(!content)return;
 const images=[...new Set([p.image,...(Array.isArray(p.images)?p.images:[])].filter(Boolean))];
 const productVariants=(p.variants||[]).length?p.variants:[{variant_key:(p.ram||"")+"|"+(p.storage||""),ram:p.ram||"",storage:p.storage||"",price:p.price,old_price:p.oldPrice,stock:p.stock}];
 const availableVariants=productVariants.filter(v=>Number(v.stock)>0);
 let selectedVariant=(availableVariants.length?availableVariants:productVariants).slice().sort((a,b)=>Number(a.price)-Number(b.price))[0];
 const variantStock=v=>Math.max(0,Number(v?.stock)||0);
 const variantState=()=>stockState(p,variantStock(selectedVariant));
 const installmentFor=price=>{const total=Number(price)*1.25;return {total,monthly:Math.ceil((total/10)/1000)*1000}};
 const installmentMessage=()=>{const calc=installmentFor(selectedVariant.price);return "أرغب بالاستفسار عن الشراء بالتقسيط عبر منصة أقساطي – مصرف الرافدين. الجهاز: "+p.name+"، النسخة: "+[selectedVariant.ram,selectedVariant.storage].filter(Boolean).join(" / ")+"، السعر النقدي: "+money(selectedVariant.price)+"، نسبة التحميل: 25%، إجمالي التقسيط قبل التقريب: "+money(calc.total)+"، القسط الشهري: "+money(calc.monthly)+" لمدة 10 أشهر، بدون دفعة أولى."};
 const specs=[
  ["الرام",selectedVariant.ram],["الذاكرة الداخلية",selectedVariant.storage],["المعالج",p.chipset],
  ["الشاشة",p.screen],["الكاميرات",p.camera],["البطارية والشحن",p.battery],
  ["مقاومة الماء والغبار",p.protection]
 ].filter(x=>x[1]);
 const productColors=(p.color||"").split(/[,،/|]+/).map(x=>x.trim()).filter(Boolean);
 let selectedProductColor=productColors.length===1?productColors[0]:"";
 const related=products.filter(x=>String(x.id)!==String(p.id)&&((p.brand&&x.brand===p.brand)||(p.categoryId&&String(x.categoryId)===String(p.categoryId)))&&x.image&&x.name&&Number(x.price)>0&&Number(x.stock)>0).slice(0,4);
 const gallery=images.length?'<div class="landing-gallery"><div class="landing-gallery-count">'+(images.length>1?'<span id="gallery-counter" dir="ltr">1 / '+images.length+'</span>':'صورة المنتج')+'</div><div class="landing-main-image"><img id="landing-main-image" src="'+escapeHtml(images[0])+'" alt="'+escapeHtml(p.name)+'" fetchpriority="high" decoding="async"></div>'+(images.length>1?'<div class="landing-thumbs">'+images.map((src,i)=>'<button type="button" class="landing-thumb '+(i===0?'active':'')+'" data-gallery-image="'+i+'" aria-label="عرض الصورة '+(i+1)+'"><img src="'+escapeHtml(src)+'" alt="" loading="lazy"></button>').join('')+'</div>':'')+'</div>':'<div class="landing-gallery"><div class="landing-main-image landing-no-image">صورة المنتج غير متوفرة حالياً</div></div>';
 content.innerHTML=
 '<div class="product-landing">'+
  '<div class="landing-topline"><span class="eyebrow">HONOR AL-DIWANIYAH</span><span id="detail-stock-state" class="landing-stock '+stockClass(variantState())+'">'+stockLabel(variantState())+'</span><button type="button" class="product-share-btn" id="product-share-link" aria-label="مشاركة رابط المنتج">مشاركة المنتج ↗</button></div>'+
  '<div class="landing-overview">'+gallery+
   '<div class="landing-buy-panel"><span class="landing-brand" dir="auto">'+escapeHtml(p.brand||p.category||"متجر هونر الديوانية")+'</span>'+
    '<h1 dir="auto">'+escapeHtml(p.name)+'</h1>'+
    '<div class="landing-memory" id="detail-memory" dir="auto">'+[selectedVariant.ram,selectedVariant.storage].filter(Boolean).map(escapeHtml).join(' · ')+'</div>'+
    '<div class="landing-price-line"><strong id="detail-price" dir="ltr">'+money(selectedVariant.price)+'</strong><del id="detail-old-price" dir="ltr" '+(Number(selectedVariant.old_price)>Number(selectedVariant.price)?'':'hidden')+'>'+money(selectedVariant.old_price)+'</del></div>'+'<div class="landing-stock-detail" id="detail-stock-text">'+stockLabel(variantState())+'</div>'+(productVariants.length>1?'<div class="product-variant-picker"><div class="variant-picker-head"><b>اختار سعة الجهاز</b><small>حدد الرام والذاكرة المناسبة إلك</small></div><div class="variant-options">'+productVariants.map((v,i)=>'<button type="button" class="variant-option '+(v.variant_key===selectedVariant.variant_key?'active':'')+'" data-variant-key="'+escapeHtml(v.variant_key)+'" aria-pressed="'+(v.variant_key===selectedVariant.variant_key?'true':'false')+'" '+(Number(v.stock)<=0?'disabled':'')+'><span class="variant-option-top"><b>'+escapeHtml(v.ram||"—")+'</b><span>'+escapeHtml(v.storage||"")+'</span></span><strong>'+money(v.price)+'</strong>'+(Number(v.stock)<=0?'<small class="variant-soldout">نفذت الكمية</small>':'')+'</button>').join('')+'</div></div>':'')+
    (productColors.length>1?'<div class="product-color-picker"><div class="product-color-heading"><b>اختار لون الجهاز</b><span>اللون المختار: <strong id="selected-product-color">'+escapeHtml(selectedProductColor||"لم يتم الاختيار")+'</strong></span></div><div class="product-color-options">'+productColors.map(color=>'<button type="button" class="product-color-option '+(color===selectedProductColor?'active':'')+'" data-product-color="'+escapeHtml(color)+'"><span class="color-dot"></span>'+escapeHtml(color)+'</button>').join('')+'</div></div>':productColors.length===1?'<div class="product-single-color">اللون المتوفر: <strong>'+escapeHtml(productColors[0])+'</strong></div>':'')+
    '<div class="landing-purchase-summary"><span>متوفر للطلب</span><span>التوصيل لجميع المحافظات</span></div>'+
    '<div class="product-purchase-controls"><div class="product-quantity-row"><span>الكمية</span><div class="product-quantity-control"><button type="button" id="detail-qty-minus">−</button><b id="detail-qty-value">1</b><button type="button" id="detail-qty-plus">+</button></div></div><div class="landing-actions"><button type="button" class="landing-cart-btn" id="detail-add-cart" '+(variantStock(selectedVariant)<=0?'disabled':'')+'>أضف للسلة</button><button type="button" class="primary-btn" id="detail-order-now" '+(variantStock(selectedVariant)<=0?'disabled':'')+'>اشترِ الآن</button><a class="landing-whatsapp-btn" id="detail-product-whatsapp" href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent("أريد الاستفسار عن "+p.name+"، النسخة: "+[selectedVariant.ram,selectedVariant.storage].filter(Boolean).join(" / ")+"، السعر: "+money(selectedVariant.price))+'" target="_blank" rel="noopener">استفسار عبر واتساب</a></div><div class="product-secondary-actions"><button type="button" data-favorite="'+escapeHtml(p.id)+'">♡ المفضلة</button><button type="button" data-compare="'+escapeHtml(p.id)+'">⇄ مقارنة</button><a href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent("استفسار عن "+p.name)+'" target="_blank" rel="noopener">استفسار عن الجملة</a></div></div><div class="product-delivery-note"><span aria-hidden="true">✓</span><span>التوصيل متاح لجميع محافظات العراق</span></div>'+
    '<div class="installment-offer"><div class="installment-offer-head"><img class="qicard-logo" src="https://gulanmedia.com/public/old_images/a_news/87788.jpg" alt="QiCard كي كارد"><div><b>أقساطي – مصرف الرافدين</b><small>متاح لموظفي الدولة</small></div><span class="installment-tag">تقسيط</span></div><div class="installment-monthly"><strong id="installment-monthly-value" dir="ltr">'+money(installmentFor(selectedVariant.price).monthly)+'</strong><small>شهرياً × 10 أشهر</small></div><div class="installment-details"><span>تحميل 25%</span><span>بدون دفعة أولى</span><span>استقطاع من الراتب</span></div><a class="installment-whatsapp" id="installment-whatsapp" href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(installmentMessage())+'" target="_blank" rel="noopener">استفسر عن التقسيط عبر واتساب ↗</a><small class="installment-disclaimer">تخضع الموافقة النهائية لشروط وإجراءات مصرف الرافدين.</small></div>'+
    ''+
   '</div>'+
  '</div>'+
  '<section class="landing-section product-info-tabs" id="product-info-tabs"><div class="product-tab-buttons" role="tablist"><button type="button" class="product-info-tab active" data-info-tab="description">الوصف</button><button type="button" class="product-info-tab" data-info-tab="specs">المواصفات</button><button type="button" class="product-info-tab" data-info-tab="delivery">الضمان والتوصيل</button></div><div class="product-tab-panel" id="product-tab-description" data-tab-panel="description">'+(p.description?'<div dir="auto">'+escapeHtml(p.description)+'</div>':'<p>لا يوجد وصف إضافي لهذا المنتج.</p>')+'</div><div class="product-tab-panel" id="product-tab-specs" data-tab-panel="specs" hidden>'+(specs.length?'<div class="landing-spec-grid">'+specs.map((s,i)=>'<article class="landing-spec"><small>'+String(i+1).padStart(2,'0')+'</small><span dir="rtl">'+escapeHtml(s[0])+'</span><b data-spec-value="'+escapeHtml(s[0])+'" dir="auto">'+escapeHtml(s[1])+'</b></article>').join('')+'</div>':'<p>المواصفات غير متوفرة.</p>')+'</div><div class="product-tab-panel" id="product-tab-delivery" data-tab-panel="delivery"><div class="product-delivery-feature-grid"><article><b>التوصيل</b><span>متاح لجميع محافظات العراق</span></article><article><b>خدمات المتجر</b><span>خدمات البيع والصيانة حسب المتوفر</span></article></div></div></section>'+
  '<section class="landing-section product-reviews-section" id="product-reviews-section" hidden><div class="landing-section-title"><span>04 / CUSTOMER REVIEWS</span><h2>تقييمات الزبائن</h2></div><div id="product-reviews-list"></div></section>'+

  (related.length?'<section class="landing-section"><div class="landing-section-title"><span>03 / YOU MAY ALSO LIKE</span><h2>منتجات مشابهة</h2></div><div class="landing-related">'+related.map(x=>'<button type="button" class="landing-related-card" data-related-product="'+escapeHtml(x.id)+'"><img data-related-image src="'+escapeHtml(x.image)+'" alt="'+escapeHtml(x.name)+'" loading="lazy"><b>'+escapeHtml(x.name)+'</b><strong dir="ltr">'+money(x.price)+'</strong></button>').join('')+'</div></section>':'')+


 '</div>';
 $("product-share-link")?.addEventListener("click",async()=>{const url=location.href;try{if(navigator.share){await navigator.share({title:p.name,text:p.name+" من HONOR AL-DIWANIYAH",url});}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast("تم نسخ رابط المنتج");}else{prompt("انسخ رابط المنتج:",url)}}catch(err){if(err?.name!=="AbortError")toast("تعذر مشاركة الرابط");}});
 document.querySelectorAll("[data-info-tab]").forEach(btn=>btn.addEventListener("click",()=>{const tab=btn.dataset.infoTab;document.querySelectorAll("[data-info-tab]").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll("[data-tab-panel]").forEach(panel=>panel.hidden=panel.dataset.tabPanel!==tab)}));
 loadProductReviews(p.id);
 document.querySelectorAll("[data-related-image]").forEach(img=>{
  const fallback=()=>{const placeholder=document.createElement("span");placeholder.className="landing-related-placeholder";placeholder.textContent="HONOR AL-DIWANIYAH";img.replaceWith(placeholder)};
  img.addEventListener("error",fallback,{once:true});
  if(img.complete&&img.naturalWidth===0)fallback();
 });
 const mainImage=$("landing-main-image");
 if(mainImage)mainImage.addEventListener("error",()=>{const placeholder=document.createElement("div");placeholder.className="landing-no-image";placeholder.textContent="صورة المنتج غير متوفرة حالياً";mainImage.replaceWith(placeholder)},{once:true});
 document.querySelectorAll("[data-gallery-image]").forEach(b=>b.addEventListener("click",()=>{
  const index=Number(b.dataset.galleryImage);
  if(mainImage&&images[index])mainImage.src=images[index];
  const counter=$("gallery-counter");if(counter)counter.textContent=(index+1)+" / "+images.length;
  document.querySelectorAll(".landing-thumb").forEach(x=>x.classList.toggle("active",x===b));
 }));
 document.querySelectorAll("[data-product-color]").forEach(btn=>btn.addEventListener("click",()=>{
  selectedProductColor=btn.dataset.productColor;
  document.querySelectorAll("[data-product-color]").forEach(x=>x.classList.toggle("active",x===btn));
  const label=$("selected-product-color");if(label)label.textContent=selectedProductColor;
 }));
 const chosenColor=()=>productColors.length>1?selectedProductColor:(productColors[0]||"");
 const chosenVariantKey=()=>selectedVariant?.variant_key||"";
 const refreshVariant=()=>{const v=productVariants.find(x=>x.variant_key===chosenVariantKey())||selectedVariant;selectedVariant=v;const price=$("detail-price"),old=$("detail-old-price"),mobile=$("detail-mobile-price"),mem=$("detail-memory"),state=variantState(),badge=$("detail-stock-state"),stockText=$("detail-stock-text");if(price)price.textContent=money(v.price);if(mobile)mobile.textContent=money(v.price);const monthly=$("installment-monthly-value"),wa=$("installment-whatsapp"),productWa=$("detail-product-whatsapp");if(monthly)monthly.textContent=money(installmentFor(v.price).monthly);if(wa)wa.href="https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(installmentMessage());if(productWa)productWa.href="https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent("أريد الاستفسار عن "+p.name+"، النسخة: "+[v.ram,v.storage].filter(Boolean).join(" / ")+"، السعر: "+money(v.price));if(old){old.textContent=money(v.old_price);old.hidden=!(Number(v.old_price)>Number(v.price))}if(mem)mem.textContent=[v.ram,v.storage].filter(Boolean).join(" · ");document.querySelectorAll("[data-spec-value]").forEach(el=>{const label=el.dataset.specValue;if(label==="الرام")el.textContent=v.ram||"غير محدد";if(label==="الذاكرة الداخلية")el.textContent=v.storage||"غير محددة"});if(badge){badge.textContent=stockLabel(state);badge.className="landing-stock "+stockClass(state)}if(stockText)stockText.textContent=stockLabel(state);["detail-order-now","detail-add-cart"].forEach(id=>{const b=$(id);if(b)b.disabled=variantStock(v)<=0})};
 document.querySelectorAll("[data-variant-key]").forEach(btn=>btn.addEventListener("click",()=>{selectedVariant=productVariants.find(v=>v.variant_key===btn.dataset.variantKey)||selectedVariant;document.querySelectorAll("[data-variant-key]").forEach(option=>{const active=option===btn;option.classList.toggle("active",active);option.setAttribute("aria-pressed",String(active))});refreshVariant()}));
 const orderNow=()=>{if(variantStock(selectedVariant)<=0)return;if(productColors.length>1&&!chosenColor()){toast("اختار لون الجهاز أولاً");return}let ok=true;for(let n=0;n<detailQty;n++){if(!addToCart(p.id,chosenColor(),chosenVariantKey())){ok=false;break}}if(ok)$("checkout-dialog").showModal()};
 let detailQty=1;const qtyDisplay=$("detail-qty-value");const setDetailQty=n=>{detailQty=Math.max(1,Math.min(variantStock(selectedVariant)||1,n));if(qtyDisplay)qtyDisplay.textContent=detailQty};$("detail-qty-minus")?.addEventListener("click",()=>setDetailQty(detailQty-1));$("detail-qty-plus")?.addEventListener("click",()=>setDetailQty(detailQty+1));
 $("detail-order-now")?.addEventListener("click",orderNow);
 $("detail-add-cart")?.addEventListener("click",()=>{if(productColors.length>1&&!chosenColor()){toast("اختار لون الجهاز أولاً");return}for(let n=0;n<detailQty;n++)if(!addToCart(p.id,chosenColor(),chosenVariantKey()))break});
 document.querySelectorAll("[data-related-product]").forEach(b=>b.addEventListener("click",()=>showProductDetails(b.dataset.relatedProduct)));
 showStorePage("product-detail",{push:false});
 const nextProductHash="#product/"+encodeURIComponent(id);
 if(location.hash!==nextProductHash)history.pushState({productId:id},"",nextProductHash);
}

function addToCart(id,color="",variantKey=""){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return false;
 const variant=p.variants?.find(v=>v.variant_key===variantKey);
 const stock=Math.max(0,Number(variant?variant.stock:p.stock)||0);
 if(stock<=0){toast("نفذت النسخة المختارة");return false}
 const row=cart.find(x=>String(x.id)===String(id)&&String(x.color||"")===String(color||"")&&String(x.variantKey||"")===String(variantKey||""));
 const sameProductQty=cart.filter(x=>String(x.id)===String(id)&&String(x.variantKey||"")===String(variantKey||"")).reduce((n,x)=>n+x.qty,0);
 if(sameProductQty>=stock){toast("الكمية المطلوبة غير متوفرة");return false}
 if(row)row.qty++;
 else cart.push({id:p.id,name:p.name,price:Number(variant?.price??p.price)||0,qty:1,color:color||"",variantKey:variant?.variant_key||"",ram:variant?.ram||p.ram||"",storage:variant?.storage||p.storage||""});
 persistCart();
 toast("انضاف المنتج إلى السلة");
 return true;
}
function renderCart(){
 const cartCount=cart.reduce((a,x)=>a+x.qty,0);
 $("cart-count").textContent=cartCount;
 if($("mobile-cart-count")) $("mobile-cart-count").textContent=cartCount;
 $("cart-items").innerHTML=cart.length?cart.map((x,index)=>`<div class="cart-row"><div><b>${escapeHtml(x.name)}</b><small>${[x.ram,x.storage].filter(Boolean).map(escapeHtml).join(" · ")}${x.color?' · اللون: '+escapeHtml(x.color):''} · ${money(x.price)} × ${x.qty}</small></div><div class="qty-controls"><button data-dec-index="${index}">−</button><b>${x.qty}</b><button data-inc-index="${index}">+</button></div></div>`).join(""):`<p class="empty-state">السلة فارغة حالياً.</p>`;
 const total=cart.reduce((a,x)=>a+(Number(x.price)||0)*x.qty,0);
 $("cart-total").textContent=money(total);
 updateCheckoutTotals();
 document.querySelectorAll("[data-inc-index]").forEach(b=>b.onclick=()=>changeQty(Number(b.dataset.incIndex),1));
 document.querySelectorAll("[data-dec-index]").forEach(b=>b.onclick=()=>changeQty(Number(b.dataset.decIndex),-1));
}
function changeQty(index,d){
 const x=cart[index];if(!x)return;
 if(d>0){
   const p=products.find(p=>String(p.id)===String(x.id));
   const stock=Math.max(0,Number(x.variantKey?p?.variants?.find(v=>v.variant_key===x.variantKey)?.stock:p?.stock)||0);
   const sameProductQty=cart.filter(item=>String(item.id)===String(x.id)&&String(item.variantKey||"")===String(x.variantKey||"")).reduce((n,item)=>n+item.qty,0);
   if(stock<=0){toast("نفذ من المخزون");return}
   if(sameProductQty>=stock){toast("الكمية المطلوبة غير متوفرة حالياً");return}
 }
 x.qty+=d;cart=cart.filter(x=>x.qty>0);persistCart();
}
function openCart(){renderCart();showStorePage("cart");}
function closeCart(){showStorePage("home");}
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
 const scopedProducts=selectedDeviceType==="الكل"?products:products.filter(p=>(p.deviceType||"phone")===selectedDeviceType);
 const brands=[...new Set(scopedProducts.map(p=>String(p.brand||"").trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"ar"));
 if(!brands.includes(selectedBrand))selectedBrand="الكل";
 brandSelect.innerHTML='<option value="الكل">كل البراندات</option>'+brands.map(b=>'<option value="'+escapeHtml(b)+'">'+escapeHtml(b)+'</option>').join("");
 brandSelect.value=selectedBrand;
 const grid=$("brand-block-grid"),scope=$("brand-scope-label");
 const typeNames={"الكل":"كل الأجهزة","phone":"الهواتف","tablet":"التابلت","accessories":"الإكسسوارات"};
 if(scope)scope.textContent=selectedDeviceType==="الكل"?"كل الشركات": "شركات "+(typeNames[selectedDeviceType]||"الأجهزة");
 document.querySelectorAll("[data-device-choice]").forEach(btn=>btn.classList.toggle("active",btn.dataset.deviceChoice===selectedDeviceType));
 if(grid)grid.innerHTML='<button type="button" class="brand-block '+(selectedBrand==="الكل"?"active":"")+'" data-brand-choice="الكل"><span class="brand-block-mark">ALL</span><b>كل الشركات</b></button>'+brands.map(b=>'<button type="button" class="brand-block '+(selectedBrand===b?"active":"")+'" data-brand-choice="'+escapeHtml(b)+'"><span class="brand-block-mark">'+escapeHtml(b.slice(0,2).toUpperCase())+'</span><b>'+escapeHtml(b)+'</b></button>').join("");
 const toggle=$("brand-collapse-toggle"),area=grid?.closest(".catalog-brand-area"),count=$("brand-collapse-count");if(count)count.textContent=brands.length?("("+brands.length+")"):"";if(toggle&&area){toggle.innerHTML=(selectedBrand==="الكل"?"عرض الشركات":"الشركة: "+escapeHtml(selectedBrand))+ " <span id=\u0022brand-collapse-count\u0022>"+(brands.length?"("+brands.length+")":"")+ "</span><i>⌄</i>";toggle.setAttribute("aria-expanded",area.classList.contains("brands-open")?"true":"false");}
}

async function loadProducts(){
 if(!hasBackend){
   products=demoProducts.filter(p=>Number(p.stock)>0);
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
     sb.from("products").select("id,category_id,name,description,price,old_price,stock,image_url,images,brand,ram,storage,color,chipset,screen,camera,battery,protection,is_featured,is_active,created_at,variants,low_stock_threshold").eq("is_active",true).order("created_at",{ascending:false})
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
       variants:Array.isArray(row.variants)?row.variants:[],lowStockThreshold:Number(row.low_stock_threshold)||3,
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
   cart=cart.filter(item=>products.some(p=>String(p.id)===String(item.id))).map(item=>{const current=products.find(p=>String(p.id)===String(item.id)),variant=current.variants?.find(v=>v.variant_key===item.variantKey);return {...item,name:current.name,price:Number(variant?.price??current.price),ram:variant?.ram??item.ram,storage:variant?.storage??item.storage};});
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
   await loadStoreBundles();
 }catch(error){
   console.error("Supabase products load failed:",error);
   products=[];
   productLoadMessage="تعذّر تحميل المنتجات من قاعدة البيانات. تأكد من صلاحيات قراءة المنتجات والأقسام في Supabase.";
   renderProducts();
 }
}
async 
function showOrderSuccess(orderNumber,order,orderedCart){
 const items=(orderedCart||[]).map(x=>({name:x.name,qty:x.qty,price:x.price,color:x.color,ram:x.ram,storage:x.storage,variantKey:x.variantKey}));
 const subtotal=items.reduce((sum,x)=>sum+Number(x.price||0)*Number(x.qty||0),0),fee=6000+Math.floor(subtotal/1000000)*2000,total=subtotal+fee;
 const numberText=String(orderNumber);
 $("success-order-number").textContent="#"+numberText;
 $("success-order-total").textContent=money(total);
 $("success-order-details").innerHTML=items.map(x=>'<div class="success-order-item"><span>'+escapeHtml(x.name)+(x.variantKey?' ('+escapeHtml(x.ram||'')+' / '+escapeHtml(x.storage||'')+')':'')+(x.color?' — '+escapeHtml(x.color):'')+' × '+Number(x.qty)+'</span><b>'+money(Number(x.price||0)*Number(x.qty||0))+'</b></div>').join('')+'<div class="success-order-fee"><span>أجور التوصيل</span><b>'+money(fee)+'</b></div>';
 const textDetails='طلب هونر الديوانية #'+numberText+'\n'+items.map(x=>x.name+(x.variantKey?' ('+(x.ram||'')+' / '+(x.storage||'')+')':'')+(x.color?' — '+x.color:'')+' × '+x.qty+' — '+money(Number(x.price||0)*Number(x.qty||0))).join('\n')+'\nأجور التوصيل: '+money(fee)+'\nالمجموع: '+money(total);
 $("success-copy-order").onclick=()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(textDetails).then(()=>toast("تم نسخ تفاصيل الطلب")).catch(()=>toast("تعذر النسخ"));else toast("النسخ غير متاح بهذا المتصفح")};
 $("success-track-order").onclick=()=>{$("order-success-dialog").close();showStorePage("tracking");};
 $("order-success-close").onclick=()=> $("order-success-dialog").close();
 const dlg=$("order-success-dialog");if(dlg&&!dlg.open)dlg.showModal();
}

async function submitOrder(e){
 e.preventDefault();
 const formEl=e.currentTarget;
 if(formEl.dataset.submitting==="true")return;
 if(!cart.length){toast("السلة فارغة");return}
 const orderStockGroups=new Map();
 for(const item of cart){
   const key=JSON.stringify([String(item.id),String(item.variantKey||"")]);
   orderStockGroups.set(key,(orderStockGroups.get(key)||0)+Number(item.qty||0));
 }
 for(const [key,qty] of orderStockGroups){
   const [id,variantKey]=JSON.parse(key);
   const p=products.find(p=>String(p.id)===id);
   const stock=Math.max(0,Number(variantKey?p?.variants?.find(v=>v.variant_key===variantKey)?.stock:p?.stock)||0);
   if(!p||stock<=0||qty>stock){
     toast(stock<=0?"نفذ من المخزون":"الكمية المطلوبة غير متوفرة حالياً");
     return;
   }
 }
 if(hasBackend&&!sb){
   $("form-message").textContent="الاتصال بقاعدة البيانات غير جاهز. حاول لاحقاً.";
   return;
 }
 const submitButton=formEl.querySelector('button[type="submit"]');
 const originalButtonText=submitButton?.textContent||"تأكيد الطلب";
 formEl.dataset.submitting="true";
 if(submitButton){submitButton.disabled=true;submitButton.textContent="جارٍ إرسال الطلب..."}
 const form=new FormData(formEl);
 const order={
   customer_name:form.get("customer_name"),phone:form.get("phone"),
   governorate:form.get("governorate"),district:form.get("district"),
   address:form.get("address"),payment_method:form.get("payment_method"),
   notes:form.get("notes"),
   items:cart.map(x=>({product_id:x.id,name:x.name,price:x.price,quantity:x.qty,color:x.color||null,variant_key:x.variantKey||null,ram:x.ram||null,storage:x.storage||null})),
   total:cart.reduce((a,x)=>a+x.price*x.qty,0),status:"new"
 };
 try{
   if(sb){
     $("form-message").textContent="جارٍ إرسال طلبك...";
     const {data:orderNumber,error}=await sb.rpc("submit_store_order",{
       p_customer_name:form.get("customer_name"),p_phone:form.get("phone"),
       p_province:form.get("governorate"),p_district:form.get("district"),
       p_address:form.get("address"),p_payment_method:form.get("payment_method"),
       p_notes:form.get("notes"),
       p_items:cart.map(x=>({product_id:x.id,quantity:x.qty,color:x.color||null,variant_key:x.variantKey||null}))
     });
     if(error)throw error;
     $("form-message").textContent="تم استلام طلبك بنجاح. رقم طلبك: "+orderNumber;
     showOrderSuccess(orderNumber,order,cart);
   }else{
     const localOrders=JSON.parse(localStorage.getItem("honor-demo-orders")||"[]");
     order.id="DEMO-"+Date.now();localOrders.push(order);
     localStorage.setItem("honor-demo-orders",JSON.stringify(localOrders));
     $("form-message").textContent="تم تسجيل طلب تجريبي على هذا الجهاز. اربط قاعدة البيانات لاستقبال طلبات حقيقية.";
   }
   cart=[];persistCart();await loadProducts();formEl.reset();updateCheckoutTotals();
   if($("checkout-dialog").open)$("checkout-dialog").close();
 }catch(error){
   console.error("Order submission failed:",error);
   $("form-message").textContent=error?.message||"تعذر إرسال الطلب حالياً. حاول مرة ثانية.";
 }finally{
   formEl.dataset.submitting="false";
   if(submitButton){submitButton.disabled=false;submitButton.textContent=originalButtonText}
 }
}

// Theme switch removed. Keep the default storefront styles; do not force legacy theme classes.
document.body.classList.remove("theme-dark", "theme-light");
localStorage.removeItem("honor-store-theme");

// Category buttons are rendered dynamically from Supabase categories.
$("search-input").addEventListener("input",()=>{if($("products-search-input"))$("products-search-input").value=$("search-input").value;visibleProductCount=productsPerPage;renderProducts()});
if($("products-search-input"))$("products-search-input").addEventListener("input",()=>{$("search-input").value=$("products-search-input").value;visibleProductCount=productsPerPage;renderProducts()});
if($("availability-filter"))$("availability-filter").addEventListener("change",e=>{selectedAvailability=e.target.value;visibleProductCount=productsPerPage;renderProducts()});
$("search-input").addEventListener("keydown",e=>{if(e.key==="Enter"){visibleProductCount=productsPerPage;renderProducts();showStorePage("products")}});

$("brand-filter").addEventListener("change",e=>{selectedBrand=e.target.value;visibleProductCount=productsPerPage;renderProducts();renderCategories(storeCategories)});
$("brand-collapse-toggle")?.addEventListener("click",()=>{const area=$("brand-collapse-toggle").closest(".catalog-brand-area");area?.classList.toggle("brands-open");$("brand-collapse-toggle").setAttribute("aria-expanded",area?.classList.contains("brands-open")?"true":"false");});
$("brand-block-grid")?.addEventListener("click",e=>{const choice=e.target.closest("[data-brand-choice]");if(!choice)return;selectedBrand=choice.dataset.brandChoice;$("brand-filter").value=selectedBrand;visibleProductCount=productsPerPage;const area=choice.closest(".catalog-brand-area");area?.classList.remove("brands-open");$("brand-collapse-toggle")?.setAttribute("aria-expanded","false");renderProducts();renderCategories(storeCategories)});
$("device-type-options")?.addEventListener("click",e=>{const choice=e.target.closest("[data-device-choice]");if(!choice)return;selectedDeviceType=choice.dataset.deviceChoice;$("device-type-filter").value=selectedDeviceType;selectedBrand="الكل";$("brand-filter").value="الكل";visibleProductCount=productsPerPage;renderCategories(storeCategories);renderProducts()});
$("device-type-filter").addEventListener("change",e=>{selectedDeviceType=e.target.value;selectedBrand="الكل";visibleProductCount=productsPerPage;renderCategories(storeCategories);renderProducts()});
if($("load-more-products")) $("load-more-products").addEventListener("click",()=>{visibleProductCount+=productsPerPage;renderProducts()});
$("search-toggle").onclick=()=>{showStorePage("products");setTimeout(()=>$("products-search-input")?.focus(),80)};
$("search-clear").onclick=()=>{$("search-input").value="";if($("products-search-input"))$("products-search-input").value="";renderProducts()};
$("cart-open").onclick=openCart;
if($("mobile-cart-open")) $("mobile-cart-open").onclick=openCart;
$("cart-close").onclick=closeCart;
$("overlay").onclick=closeCart;
$("checkout-open").onclick=()=>{if(!cart.length)return toast("السلة فارغة");closeCart();$("checkout-dialog").showModal()};
$("checkout-close").onclick=()=>$("checkout-dialog").close();

$("installment-calculator-open")?.addEventListener("click",()=>{$("installment-calculator-dialog").showModal();$("installment-cash-price")?.focus()});
$("installment-calculator-close")?.addEventListener("click",()=>$("installment-calculator-dialog").close());
$("installment-calculator-dialog")?.addEventListener("click",e=>{if(e.target===$("installment-calculator-dialog"))$("installment-calculator-dialog").close()});
$("installment-cash-price")?.addEventListener("input",e=>{
 const cash=Number(e.target.value),box=$("installment-calculator-results");
 if(!Number.isFinite(cash)||cash<=0){box.innerHTML='<p class="installment-calculator-empty">اكتب سعر الجهاز حتى تظهر تفاصيل الأقساط.</p>';return}
 const load=cash*.25,total=cash+load,monthly=Math.ceil((total/10)/1000)*1000;
 box.innerHTML='<div class="installment-calculator-row"><span>السعر النقدي</span><b>'+money(cash)+'</b></div><div class="installment-calculator-row"><span>التحميل 25%</span><b>'+money(load)+'</b></div><div class="installment-calculator-row installment-calculator-total"><span>إجمالي التقسيط</span><b>'+money(total)+'</b></div><div class="installment-calculator-monthly"><small>القسط الشهري لمدة 10 أشهر</small><strong>'+money(monthly)+'</strong></div>';
});

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

$("menu-toggle").onclick=()=>{const nav=document.querySelector(".desktop-nav");const open=nav.classList.toggle("mobile-open");$("menu-toggle").setAttribute("aria-expanded",String(open));$("menu-toggle").setAttribute("aria-label",open?"إغلاق القائمة":"فتح القائمة")};

function renderFavorites(){const section=$("home-favorites-section"),grid=$("home-favorites-grid");if(!section||!grid)return;const rows=favoriteIds.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);section.classList.toggle("hidden",!rows.length);grid.innerHTML=rows.map(p=>'<article class="home-product-card"><button type="button" class="home-product-open" data-home-details="'+escapeHtml(p.id)+'"><div class="home-product-image">'+(p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'">':'<span>HONOR AL-DIWANIYAH</span>')+'</div><b>'+escapeHtml(p.name)+'</b><strong>'+money(p.price)+'</strong></button></article>').join("");}

function renderFinderResults(form){
 const budget=Number(form.get("budget")),usage=form.get("usage"),type=form.get("type");
 const candidates=products.filter(p=>p.stock>0&&p.price<=budget&&(type==="all"||p.deviceType===type));
 const score=p=>{let n=0;if(usage==="camera"&&p.camera)n+=3;if(usage==="gaming"&&p.chipset)n+=3;if(usage==="battery"&&p.battery)n+=3;if(usage==="study"&&p.deviceType==="tablet")n+=4;if(usage==="daily")n+=2;if(p.isFeatured)n+=1;return n};
 const results=candidates.sort((a,b)=>score(b)-score(a)||b.price-a.price).slice(0,5),box=$("finder-results");
 box.innerHTML=results.length?'<h2>ترشيحات مناسبة إلك</h2><div class="finder-result-grid">'+results.map(p=>'<article class="finder-result-card">'+(p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'">':'<div class="finder-no-image">HONOR AL-DIWANIYAH</div>')+'<small>'+escapeHtml(p.brand||p.category)+'</small><b>'+escapeHtml(p.name)+'</b><strong>'+money(p.price)+'</strong><button type="button" class="add-btn" data-finder-detail="'+escapeHtml(p.id)+'">تفاصيل الجهاز</button></article>').join("")+'</div>':'<p class="landing-empty-specs">ما لقينا جهاز متوفر ضمن الميزانية والنوع المحددين. جرّب ترفع الميزانية أو تغيّر نوع الجهاز.</p>';
 box.querySelectorAll("[data-finder-detail]").forEach(b=>b.onclick=()=>showProductDetails(b.dataset.finderDetail));
}
function bindFeatureForms(){
 $("device-finder-form")?.addEventListener("submit",e=>{e.preventDefault();renderFinderResults(new FormData(e.currentTarget))});
 $("repair-request-form")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),msg=$("repair-form-message"),btn=f.querySelector('button[type="submit"]');btn.disabled=true;msg.textContent="جارٍ إرسال الطلب...";try{const {data,error}=await sb.rpc("submit_repair_request",{p_customer_name:d.get("customer_name"),p_phone:d.get("phone"),p_device_brand:d.get("device_brand"),p_device_model:d.get("device_model"),p_issue:d.get("issue"),p_preferred_time:d.get("preferred_time")||""});if(error)throw error;msg.textContent="وصل طلبك بنجاح. رقم طلب الصيانة: #"+data+" — نتواصل وياك لتأكيد التفاصيل.";f.reset()}catch(err){msg.textContent=err.message||"تعذر إرسال الطلب حالياً."}finally{btn.disabled=false}});
 $("tradein-request-form")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),msg=$("tradein-form-message"),btn=f.querySelector('button[type="submit"]');btn.disabled=true;msg.textContent="جارٍ إرسال الطلب...";try{const {data,error}=await sb.rpc("submit_trade_in_request",{p_customer_name:d.get("customer_name"),p_phone:d.get("phone"),p_device_brand:d.get("device_brand"),p_device_model:d.get("device_model"),p_storage:d.get("storage")||"",p_condition:d.get("condition"),p_accessories:d.get("accessories")||"",p_notes:d.get("notes")||"",p_desired_device:d.get("desired_device")||""});if(error)throw error;msg.textContent="وصل طلب الاستبدال رقم #"+data+". التقييم النهائي بعد فحص الجهاز بالمتجر.";f.reset()}catch(err){msg.textContent=err.message||"تعذر إرسال الطلب حالياً."}finally{btn.disabled=false}});
}

function renderCompareDock(){const d=$("compare-dock");if(!d)return;d.classList.toggle("hidden",!compareIds.length);$("compare-count").textContent=compareIds.length;}
function renderCompare(){const rows=compareIds.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);const fields=[["السعر",p=>money(p.price)],["الماركة",p=>p.brand||"—"],["الرام",p=>p.ram||"—"],["الذاكرة",p=>p.storage||"—"],["الشاشة",p=>p.screen||"—"],["المعالج",p=>p.chipset||"—"],["الكاميرات",p=>p.camera||"—"],["البطارية",p=>p.battery||"—"],["التوفر",p=>p.stock>0?"متوفر":"نفذت الكمية"]];$("compare-content").innerHTML=rows.length?'<div class="compare-table-wrap"><table class="compare-table" dir="rtl"><colgroup><col class="compare-label-col">'+rows.map(()=>'<col>').join("")+'</colgroup><thead><tr><th scope="col">المواصفة</th>'+rows.map(p=>'<th scope="col">'+escapeHtml(p.name)+'</th>').join("")+'</tr></thead><tbody>'+fields.map(f=>'<tr><th scope="row">'+f[0]+'</th>'+rows.map(p=>'<td>'+escapeHtml(f[1](p))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':'<p>أضف أجهزة للمقارنة.</p>';}
document.addEventListener("click",e=>{const f=e.target.closest("[data-favorite]"),c=e.target.closest("[data-compare]");if(f){e.preventDefault();e.stopPropagation();const id=String(f.dataset.favorite);favoriteIds=favoriteIds.includes(id)?favoriteIds.filter(x=>x!==id):favoriteIds.concat(id);localStorage.setItem("honor-favorites",JSON.stringify(favoriteIds));renderProducts();renderFavorites();toast(favoriteIds.includes(id)?"انضاف للمفضلة":"انحذف من المفضلة");}if(c){e.preventDefault();e.stopPropagation();const id=String(c.dataset.compare);if(compareIds.includes(id)){compareIds=compareIds.filter(x=>x!==id);localStorage.setItem("honor-compare",JSON.stringify(compareIds));renderCompareDock();renderProducts();toast("انحذف من المقارنة");return;}if(compareIds.length>=3){toast("تقدر تقارن 3 أجهزة كحد أقصى");return;}compareIds.push(id);localStorage.setItem("honor-compare",JSON.stringify(compareIds));renderCompareDock();renderProducts();toast("انضاف للمقارنة");}});
bindFeatureForms();
$("compare-open")?.addEventListener("click",()=>{renderCompare();$("compare-dialog").showModal();});
$("compare-close")?.addEventListener("click",()=>$("compare-dialog").close());
$("compare-clear")?.addEventListener("click",()=>{compareIds=[];localStorage.setItem("honor-compare","[]");renderCompareDock();renderProducts();renderCompare();toast("تم مسح المقارنة");});

$("home-deals-more")?.addEventListener("click",()=>{selectedDeviceType="الكل";$("device-type-filter").value="الكل";selectedBrand="الكل";$("brand-filter").value="الكل";selectedAvailability="available";$("availability-filter").value="available";$("products-search-input").value="";visibleProductCount=productsPerPage;renderProducts();showStorePage("products");});
function showStorePage(page,{push=true}={}){
 const allowed=["home","departments","products","accessories","maintenance","finder","repair","tradein","product-detail","tracking","cart"];
 if(!allowed.includes(page))page="home";
 document.querySelectorAll("[data-page-view]").forEach(view=>view.classList.toggle("active",view.dataset.pageView===page));
 document.querySelectorAll("[data-page]").forEach(link=>{
   const active=link.dataset.page===page;
   link.classList.toggle("active",active);
   if(link.classList.contains("mobile-nav-item"))link.setAttribute("aria-current",active?"page":"false");
 });
 document.querySelector(".desktop-nav")?.classList.remove("mobile-open");
 $("menu-toggle")?.setAttribute("aria-expanded","false");
 $("menu-toggle")?.setAttribute("aria-label","فتح القائمة");
 if(push)history.pushState({storePage:page},"","#"+page);
 const recentlyViewed=$("recently-viewed-section");
 if(recentlyViewed)recentlyViewed.classList.toggle("hidden",page!=="home"||recentlyViewed.dataset.hasItems!=="true");
 window.scrollTo({top:0,behavior:"instant"});
}
document.querySelectorAll("[data-home-compare]").forEach(link=>link.addEventListener("click",()=>toast("اختار جهازين من المنتجات واضغط قارن لإظهار الفروقات.")));
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
$("checkout-form")?.elements.governorate.addEventListener("change",updateCheckoutTotals);
loadDeliveryRates();
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
$a("admin-add-product").onclick=()=>openProdA();function openProdA(id){const f=$a("admin-product-form");f.reset();f.elements.id.value="";f.elements.is_active.checked=true;if(f.elements.is_featured)f.elements.is_featured.checked=false;f.elements.low_stock_threshold.value=3;productImageItemsA=[];if(id){const p=prodA.find(x=>x.id===id);Object.keys(p).forEach(k=>{if(f.elements[k]&&k!=="images"&&k!=="variants")f.elements[k].value=p[k]??""});f.elements.variants_text.value=(p.variants||[]).map(v=>[v.ram,v.storage,v.price,v.old_price||"",v.stock].join(" | ")).join("\n");f.elements.low_stock_threshold.value=p.low_stock_threshold||3;const urls=[p.image_url,...(Array.isArray(p.images)?p.images:[])].filter(Boolean);productImageItemsA=urls.map(url=>({url}));f.elements.is_active.checked=!!p.is_active;if(f.elements.is_featured)f.elements.is_featured.checked=!!p.is_featured}renderProductImagePreviewA();$a("admin-product-dialog").showModal()}
 $a("admin-products-list").addEventListener("click",async e=>{const edit=e.target.closest("[data-admin-edit]"),toggle=e.target.closest("[data-admin-toggle]");if(edit)openProdA(edit.dataset.adminEdit);if(toggle){const p=prodA.find(x=>x.id===toggle.dataset.adminToggle);const {error}=await dbA.from("products").update({is_active:!p.is_active}).eq("id",p.id);if(error){toastA(error.message);return}await loadA()}});
 $a("admin-product-form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f)),submit=f.querySelector('button[type="submit"],button:not([type])');if(submit){submit.disabled=true;submit.textContent="جارٍ رفع الصور والحفظ..."}const uploadedPaths=[];try{const finalUrls=[];for(let i=0;i<productImageItemsA.length;i++){const item=productImageItemsA[i];if(item.url){finalUrls.push(item.url);continue}const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[item.file.type]||"jpg";const path="products/"+Date.now()+"-"+Math.random().toString(36).slice(2,10)+"-"+i+"."+ext;const {error:uploadError}=await dbA.storage.from("product-images").upload(path,item.file,{contentType:item.file.type,cacheControl:"31536000",upsert:false});if(uploadError)throw uploadError;uploadedPaths.push(path);finalUrls.push(dbA.storage.from("product-images").getPublicUrl(path).data.publicUrl)}const variants=(d.variants_text||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.split("|").map(x=>x.trim());if(parts.length<5)throw new Error("صيغة النسخ: RAM | STORAGE | PRICE | OLD PRICE | STOCK");const [ram,storage,price,old_price,stock]=parts;if(!Number.isFinite(Number(price))||Number(price)<0||!Number.isFinite(Number(stock))||Number(stock)<0)throw new Error("تأكد من السعر والمخزون لكل نسخة");return {variant_key:ram+"|"+storage,ram,storage,price:Number(price),old_price:old_price?Number(old_price):null,stock:Number(stock)}});if(!variants.length)variants.push({variant_key:(d.ram||"")+"|"+(d.storage||""),ram:d.ram||"",storage:d.storage||"",price:Number(d.price),old_price:d.old_price?Number(d.old_price):null,stock:Number(d.stock||0)});const cheapest=variants.slice().sort((a,b)=>a.price-b.price)[0];const payload={name:d.name,brand:d.brand||null,category_id:d.category_id||null,price:cheapest.price,old_price:cheapest.old_price,stock:variants.reduce((sum,v)=>sum+v.stock,0),ram:cheapest.ram||null,storage:cheapest.storage||null,variants,low_stock_threshold:Math.max(1,Number(d.low_stock_threshold)||3),color:d.color||null,sku:d.sku||null,image_url:finalUrls[0]||null,images:finalUrls.slice(1),chipset:d.chipset||null,screen:d.screen||null,camera:d.camera||null,battery:d.battery||null,protection:d.protection||null,description:d.description||null,is_active:f.elements.is_active.checked,is_featured:!!f.elements.is_featured?.checked};const q=d.id?dbA.from("products").update(payload).eq("id",d.id):dbA.from("products").insert(payload);const {error}=await q;if(error)throw error;$a("admin-product-dialog").close();toastA("تم حفظ المنتج وصوره بنجاح");productImageItemsA=[];await loadA()}catch(error){if(uploadedPaths.length)await dbA.storage.from("product-images").remove(uploadedPaths);toastA("تعذر الحفظ: "+(error.message||"تحقق من الاتصال والصلاحيات"))}finally{if(submit){submit.disabled=false;submit.textContent="حفظ"}}};
 $a("admin-add-category").onclick=()=>$a("admin-category-dialog").showModal();
 $a("admin-category-form").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const {error}=await dbA.from("categories").insert({name:d.name.trim(),slug:d.slug.trim().toLowerCase(),is_active:true});if(error){toastA("تعذرت إضافة القسم: "+error.message);return}$a("admin-category-dialog").close();toastA("تمت إضافة القسم");await loadA()};
 $a("admin-categories-list").addEventListener("click",async e=>{const b=e.target.closest("[data-admin-cat-toggle]");if(!b)return;const c=catA.find(x=>x.id===b.dataset.adminCatToggle);const {error}=await dbA.from("categories").update({is_active:!c.is_active}).eq("id",c.id);if(error){toastA(error.message);return}await loadA()});
 async function orderDetailA(id){const o=ordA.find(x=>x.id===id);if(!o)return;const items=o.order_items||[];const summary="الطلب #"+(o.order_number||o.id.slice(0,8))+"\\nالزبون: "+o.customer_name+"\\nالهاتف: "+o.phone+"\\nالعنوان: "+(o.province||"")+" - "+(o.district||"")+"\\n"+(o.address||"")+"\\n\\nالمنتجات:\\n"+items.map(i=>i.product_name+" × "+i.quantity+" — "+moneyA(i.line_total)).join("\\n")+"\\n\\nالمجموع: "+moneyA(o.total)+"\\nالحالة الحالية: "+statusA(o.status);alert(summary);const status=prompt("اكتب الحالة الجديدة: new / confirmed / processing / shipped / delivered / cancelled",o.status);if(status===null)return;if(!["new","confirmed","processing","shipped","delivered","cancelled"].includes(status)){toastA("الحالة غير صحيحة");return}const {error}=await dbA.rpc("admin_update_order_status",{p_order_id:id,p_status:status});if(error){toastA("تعذر تحديث الطلب: "+error.message);return}toastA("تم تحديث الطلب والمخزون");await loadA()}
 document.addEventListener("click",e=>{const b=e.target.closest("[data-admin-order]");if(b)orderDetailA(b.dataset.adminOrder)});
 authA();
})();

document.addEventListener("change",e=>{if(e.target&&e.target.id==="catalog-sort"){catalogSort=e.target.value;visibleProductCount=productsPerPage;renderProducts();}});
