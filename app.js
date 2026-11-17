const IRAQI_GOVERNORATES = ["بغداد","البصرة","نينوى","أربيل","السليمانية","دهوك","كركوك","ديالى","الأنبار","بابل","كربلاء","النجف","القادسية","المثنى","ذي قار","ميسان","واسط","صلاح الدين"];
const demoProducts = [
 {id:"p1",name:"HONOR X9d",category:"هواتف",description:"بطارية قوية وتجربة استخدام مميزة",price:493000,image:"",tag:"الأكثر طلباً"},
 {id:"p2",name:"HONOR 600",category:"هواتف",description:"تصميم أنيق وأداء متوازن",price:645000,image:"",tag:"جديد"},
 {id:"p3",name:"HONOR X7e",category:"هواتف",description:"خيار عملي للاستخدام اليومي",price:235000,image:"",tag:""},
 {id:"p4",name:"HONOR Pad",category:"تابلت",description:"شاشة واسعة للدراسة والترفيه",price:290000,image:"",tag:""},
 {id:"p5",name:"سماعات HONOR",category:"إكسسوارات",description:"صوت واضح واتصال لاسلكي",price:45000,image:"",tag:""},
 {id:"p6",name:"شاحن سريع",category:"إكسسوارات",description:"شحن عملي للأجهزة المتوافقة",price:25000,image:"",tag:""}
];
let products = [...demoProducts], cart = JSON.parse(localStorage.getItem("honor-cart")||"[]"), activeCategory="الكل";
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-US").format(Number(n)||0)+" د.ع";
const cfg = window.STORE_CONFIG || {};
const hasBackend = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
let sb = null;
if (hasBackend && window.supabase) sb = window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function persistCart(){localStorage.setItem("honor-cart",JSON.stringify(cart));renderCart()}
function renderProducts(){
 const q=$("search-input").value.trim().toLowerCase();
 const filtered=products.filter(p=>(activeCategory==="الكل"||p.category===activeCategory)&&(`${p.name} ${p.description||""}`).toLowerCase().includes(q));
 $("product-grid").innerHTML=filtered.map(p=>`<article class="product-card">
   ${p.tag?`<span class="product-tag">${p.tag}</span>`:""}
   <div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:`<span>صورة المنتج<br>تُضاف من لوحة الإدارة</span>`}</div>
   <h3>${escapeHtml(p.name)}</h3><div class="product-meta">${escapeHtml(p.description||p.category||"")}</div>
   <div class="product-bottom"><b class="price">${money(p.price)}</b><button class="add-btn" data-add="${p.id}">أضف للسلة +</button></div>
 </article>`).join("");
 $("empty-state").classList.toggle("hidden",filtered.length>0);
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const row=cart.find(x=>x.id===id);row?row.qty++:cart.push({id:p.id,name:p.name,price:p.price,qty:1});persistCart();toast("انضاف المنتج إلى السلة")}
function renderCart(){
 $("cart-count").textContent=cart.reduce((a,x)=>a+x.qty,0);
 $("cart-items").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><b>${escapeHtml(x.name)}</b><small>${money(x.price)} × ${x.qty}</small></div><div class="qty-controls"><button data-dec="${x.id}">−</button><b>${x.qty}</b><button data-inc="${x.id}">+</button></div></div>`).join(""):`<p class="empty-state">السلة فارغة حالياً.</p>`;
 const total=cart.reduce((a,x)=>a+x.price*x.qty,0);$("cart-total").textContent=money(total);$("checkout-total").textContent=money(total);
 document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
 document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
}
function changeQty(id,d){const x=cart.find(x=>x.id===id);if(x)x.qty+=d;cart=cart.filter(x=>x.qty>0);persistCart()}
function openCart(){ $("overlay").classList.add("show");$("cart-drawer").classList.add("open")}
function closeCart(){ $("overlay").classList.remove("show");$("cart-drawer").classList.remove("open")}
function initGovernors(){$("checkout-form").governorate.innerHTML='<option value="">اختر المحافظة</option>'+IRAQI_GOVERNORATES.map(x=>`<option>${x}</option>`).join("")}
async function submitOrder(e){
 e.preventDefault();if(!cart.length){toast("السلة فارغة");return}
 const form=new FormData(e.currentTarget), order={customer_name:form.get("customer_name"),phone:form.get("phone"),governorate:form.get("governorate"),district:form.get("district"),address:form.get("address"),payment_method:form.get("payment_method"),notes:form.get("notes"),items:cart.map(x=>({product_id:x.id,name:x.name,price:x.price,quantity:x.qty})),total:cart.reduce((a,x)=>a+x.price*x.qty,0),status:"new",created_at:new Date().toISOString()};
 if(sb){
   const {data,error}=await sb.from("orders").insert({customer_name:order.customer_name,phone:order.phone,governorate:order.governorate,district:order.district,address:order.address,payment_method:order.payment_method,notes:order.notes,total:order.total,items:order.items,status:"new"}).select("id").single();
   if(error){$("form-message").textContent="تعذر إرسال الطلب حالياً. حاول مرة أخرى.";return}
   $("form-message").textContent="تم استلام طلبك بنجاح. رقم الطلب: "+data.id;
 }else{
   const localOrders=JSON.parse(localStorage.getItem("honor-demo-orders")||"[]");order.id="DEMO-"+Date.now();localOrders.push(order);localStorage.setItem("honor-demo-orders",JSON.stringify(localOrders));
   $("form-message").textContent="تم تسجيل طلب تجريبي على هذا الجهاز. اربط قاعدة البيانات لاستقبال طلبات حقيقية.";
 }
 cart=[];persistCart();e.currentTarget.reset();setTimeout(()=>$("checkout-dialog").close(),3000);
}
function loadProducts(){if(!sb)return;sb.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false}).then(({data,error})=>{if(!error&&data&&data.length){products=data;renderProducts()}})}
document.querySelectorAll(".category-card").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".category-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeCategory=b.dataset.category;renderProducts()}));
$("search-input").addEventListener("input",renderProducts);$("search-toggle").onclick=()=>{$("search-box").scrollIntoView({behavior:"smooth"});$("search-input").focus()};$("search-clear").onclick=()=>{$("search-input").value="";renderProducts()};
$("cart-open").onclick=openCart;$("cart-close").onclick=closeCart;$("overlay").onclick=closeCart;
$("checkout-open").onclick=()=>{if(!cart.length)return toast("السلة فارغة");closeCart();$("checkout-dialog").showModal()};
$("checkout-close").onclick=()=>$("checkout-dialog").close();$("checkout-form").addEventListener("submit",submitOrder);
$("menu-toggle").onclick=()=>document.querySelector(".desktop-nav").classList.toggle("mobile-open");
$("year").textContent=new Date().getFullYear();initGovernors();renderProducts();renderCart();loadProducts();
