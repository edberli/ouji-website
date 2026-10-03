import {loadCounts, RATING_SOURCE} from './counts.js';
import {renderCard} from './card.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>new Intl.NumberFormat('zh-HK').format(n);
const node=x=>x?.node||x;
const variants=p=>(p.variants?.edges||[]).map(node);
const images=p=>(p.images?.edges||[]).map(node);
const showToast=(message,error=false)=>{
 const el=$('#o-toast');$('#o-toast-message').textContent=message;
 el.classList.toggle('o-toast--error',error);el.querySelector('strong').textContent=error?'!':'✓';
 el.setAttribute('role',error?'alert':'status');el.hidden=false;el.dataset.state='entering';
 requestAnimationFrame(()=>{el.dataset.state='visible';});clearTimeout(showToast.timer);
 const pause=()=>clearTimeout(showToast.timer);
 const resume=()=>{showToast.timer=setTimeout(()=>{el.dataset.state='entering';setTimeout(()=>{el.hidden=true},200)},4000)};
 el.onmouseenter=pause;el.onmouseleave=resume;el.onfocusin=pause;el.onfocusout=resume;resume();
};
function selectProducts(products,ratings) {
 const valid=p=>images(p).length>0&&p.title!=='CLIO 極緻捲翹超防水睫毛膏';
 const eligible=products.filter(valid);
 const api=globalThis.OUJI_purchasable;
 const live=p=>variants(p).filter(v=>api.isPurchasable(v,{lens:api.isLensProduct(p)}));
 const picks=[
  eligible.find(p=>live(p).length&&ratings[p.handle]?.count>=20&&variants(p).some(v=>Number(v.compareAtPrice?.amount)>Number(v.price?.amount))),
  eligible.find(p=>live(p).length===1&&live(p)[0].quantityAvailable>0&&live(p)[0].quantityAvailable<=2),
  eligible.find(p=>variants(p).length>1&&live(p).length&&ratings[p.handle]?.count>=20),
  eligible.find(p=>!live(p).length),
  eligible.find(p=>live(p).length&&ratings[p.handle]?.count>=20)
 ];
 return [...new Set(picks.filter(Boolean))];
}
async function boot(){
 try {
 const [counts,catalog,ratings]=await Promise.all([
  loadCounts(),fetch('../data/catalog.json').then(r=>r.json()),fetch('../data/ratings.json').then(r=>r.json())
 ]);
 const products=catalog.v.map(node);const chosen=selectProducts(products,ratings.products);
 $('#o-type-numeral').textContent=fmt(counts.brandCount);
 $('#o-proof-count').textContent=fmt(counts.brandCount);
 $('#o-type-price').textContent='HK$'+new Intl.NumberFormat('zh-HK').format(Number(variants(chosen[0])[0]?.price?.amount||0));
 $('#o-products-total').textContent=`${counts.format(counts.productCount)} 件現貨`;
 $('#o-toolbar-count').textContent=`${counts.format(counts.productCount)} 件`;
 $('#o-chip-count').textContent=counts.format(counts.categoryCount('護膚'));
 $('#o-rating-legend').textContent=`★ 評分來自 ${ratings.source}`;
 $('#o-cards').innerHTML=chosen.map(p=>`<li class="o-rail__item">${renderCard(p,{ratings:ratings.products,urlPrefix:'../'})}</li>`).join('');
 $('#o-brand-meta').textContent=`${counts.format(counts.brandCount)} 個品牌有現貨，按品牌嘅產品深度排列。`;
 $('#o-shelf-total').textContent=fmt(counts.brandCount);
 $('#o-brand-link').textContent=`全部 ${counts.format(counts.brandCount)} 個品牌 →`;
 const groups=['kbeauty','beauty'];
 const all=groups.flatMap(group=>counts.sorted(group));const max=Math.max(...all.map(b=>b.count),1);
 $('#o-shelf-row').innerHTML=groups.map(group=>{
  const brands=counts.sorted(group);
  if(!brands.length)return '';
  return `<li class="o-shelf__group o-latin" aria-hidden="true">${group==='kbeauty'?'K-BEAUTY':'BEAUTY'}</li>`+brands.map(b=>`<li class="o-shelf__item"><a class="o-shelf__spine" href="../shop.html?brand=${encodeURIComponent(b.vendor)}" style="--o-spine-height:${Math.max(24,b.count/max*100).toFixed(2)}%" aria-label="${esc(b.name_en)}，${fmt(b.count)} 件"><span class="o-shelf__spine-name">${esc(b.name_en)}</span><span class="o-shelf__spine-count">${fmt(b.count)}</span></a></li>`).join('');
 }).join('');
 $('#o-brand-tiles').innerHTML=all.slice(0,6).map(b=>`<a class="o-brand" href="../shop.html?brand=${encodeURIComponent(b.vendor)}"><img class="o-brand__logo" src="../${esc(b.logo)}" alt="" loading="lazy"><span class="o-brand__name">${esc(b.name_en)}</span>${b.name_zh?`<span class="o-brand__zh">${esc(b.name_zh)}</span>`:''}<span class="o-brand__count">${fmt(b.count)} 件</span></a>`).join('');
 $('#o-cards').addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');if(!button)return;
  const product=products.find(p=>p.handle===button.closest('[data-handle]')?.dataset.handle);if(!product)return;
  if(button.dataset.action==='wishlist'){showToast('已記低你嘅選擇');return;}
  if(button.dataset.action==='variants'){
   $('#o-variant-title').textContent=product.title;
   $('#o-variant-list').innerHTML=variants(product).map(v=>{
    const can=globalThis.OUJI_purchasable.isPurchasable(v,{lens:globalThis.OUJI_purchasable.isLensProduct(product)});
    const preorder=globalThis.OUJI_purchasable.isPreorder(v,{lens:globalThis.OUJI_purchasable.isLensProduct(product)});
    return `<button type="button" class="o-chip" ${can?'':'disabled'}>${esc(v.title)}${can?(preorder?' · 預訂 · 約 14 日':''):' · 缺貨'}</button>`;
   }).join('');$('#o-variant-sheet').showModal();return;
  }
  showToast('示範頁只展示按鍵狀態；購買請到產品頁');
 });
 }catch(error){console.error('Design-system demo data failed:',error);showToast('暫時讀唔到目錄資料，請重新載入',true)}
}
document.addEventListener('DOMContentLoaded',()=>{
 boot();
 document.querySelectorAll('.o-chip[aria-pressed]').forEach(chip=>chip.addEventListener('click',()=>chip.setAttribute('aria-pressed',String(chip.getAttribute('aria-pressed')!=='true'))));
 $('#o-toast-demo').onclick=()=>showToast('已記低你嘅選擇');
 $('#o-toast-error-demo').onclick=()=>showToast('暫時加唔到，請再試一次',true);
 $('#o-error-retry').onclick=()=>location.reload();
 $('#o-clear-all').onclick=()=>{$('#o-clear-chip').hidden=true;showToast('已清除篩選')};
 $('#o-clear-chip').onclick=()=>{$('#o-clear-chip').hidden=true};
 $('#o-filter-open').onclick=()=>$('#o-filter-drawer').showModal();
 const list=$('#o-cards');
 document.querySelectorAll('[data-rail]').forEach(btn=>btn.onclick=()=>{list.scrollBy({left:(btn.dataset.rail==='next'?1:-1)*list.querySelector('li').getBoundingClientRect().width,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})});
 list.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();list.scrollBy({left:(e.key==='ArrowRight'?1:-1)*list.querySelector('li').getBoundingClientRect().width,behavior:'smooth'})}});
 list.addEventListener('scroll',()=>{const buttons=document.querySelectorAll('[data-rail]');buttons[0].disabled=list.scrollLeft<=1;buttons[1].disabled=list.scrollLeft+list.clientWidth>=list.scrollWidth-2},{passive:true});
 $('#o-variant-list').addEventListener('click',e=>{if(e.target.closest('button:not(:disabled)')){showToast('已揀款式');$('#o-variant-sheet').close()}});
});
