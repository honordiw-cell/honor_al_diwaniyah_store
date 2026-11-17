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
 $("product-grid").innerHTML=filtered.map(p=>`<article class="product-card">
   ${p.tag?`<span class="product-tag">${escapeHtml(p.tag)}</span>`:""}
   <div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:`<span>صورة المنتج<br>تُضاف من لوحة الإدارة</span>`}</div>
   <h3>${escapeHtml(p.name)}</h3><div class="product-meta">${escapeHtml(p.description||p.category||"")}</div>
   <div class="product-bottom"><b class="price">${money(p.price)}</b><button class="add-btn" data-add="${escapeHtml(p.id)}">أضف للسلة +</button></div>
 </article>`).join("");
 const empty=$("empty-state");
 empty.classList.toggle("hidden",filtered.length>0);
 if(!filtered.length && productLoadMessage) empty.textContent=productLoadMessage;
 else empty.textContent="ماكو منتجات تطابق بحثك حالياً.";
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
function addToCart(id){
 const p=products.find(x=>String(x.id)===String(id));
 if(!p)return;
 const row=cart.find(x=>String(x.id)===String(id));
 row?row.qty++:cart.push({id:p.id,name:p.name,price:Number(p.price)||0,qty:1});
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
 if(x)x.qty+=d;
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
 const items=[{id:"الكل",name:"كل المنتجات",slug:"all"},...storeCategories];
 grid.innerHTML=items.map((c,i)=>`<button class="category-card ${i===0?"active":""}" data-category="${escapeHtml(c.id)}"><span>${i===0?"▣":categoryIcon(c)}</span><b>${escapeHtml(c.name)}</b></button>`).join("");
 grid.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{
   grid.querySelectorAll(".category-card").forEach(x=>x.classList.remove("active"));
   b.classList.add("active");
   activeCategory=b.dataset.category;
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
     sb.from("products").select("id,category_id,name,description,price,stock,image_url,brand,is_active,created_at").eq("is_active",true).order("created_at",{ascending:false})
   ]);

   if(productError) throw productError;

   const categoryMap=new Map((categories||[]).map(c=>[String(c.id),c]));
   products=(rows||[]).map(row=>{
     const category=categoryMap.get(String(row.category_id));
     return {
       id:String(row.id),
       name:row.name,
       categoryId:row.category_id||"",
       category:category?.name||"غير مصنف",
       description:row.description||row.brand||category?.name||"",
       price:Number(row.price)||0,
       stock:Number(row.stock)||0,
       image:row.image_url||"",
       brand:row.brand||"",
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
$("search-input").addEventListener("input",renderProducts);
$("search-toggle").onclick=()=>{$("search-box").scrollIntoView({behavior:"smooth"});$("search-input").focus()};
$("search-clear").onclick=()=>{$("search-input").value="";renderProducts()};
$("cart-open").onclick=openCart;
$("cart-close").onclick=closeCart;
$("overlay").onclick=closeCart;
$("checkout-open").onclick=()=>{if(!cart.length)return toast("السلة فارغة");closeCart();$("checkout-dialog").showModal()};
$("checkout-close").onclick=()=>$("checkout-dialog").close();
$("checkout-form").addEventListener("submit",submitOrder);
$("menu-toggle").onclick=()=>document.querySelector(".desktop-nav").classList.toggle("mobile-open");
$("year").textContent=new Date().getFullYear();
initGovernors();
renderProducts();
renderCart();
loadProducts();
