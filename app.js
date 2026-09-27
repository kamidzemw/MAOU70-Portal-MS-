const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt = d => new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d));
const MAIN_ADMIN_ID = '4a098f87-b2c0-4aa2-9333-a3e2e4afb44e';
const nickHtml = (name,id) => `<span class="${id===MAIN_ADMIN_ID?'main-admin-nick':''}">${esc(name)}</span>`;

const mediaHtml = (url,alt='Медиа') => {
  const safe=esc(url);
  const clean=String(url||'').split('?')[0].toLowerCase();
  const isVideo=/\.(mp4|webm|ogg|mov|m4v)$/.test(clean);
  return isVideo
    ? `<video class="media-content" src="${safe}" controls preload="metadata" playsinline></video>`
    : `<a href="${safe}" target="_blank" rel="noopener"><img class="media-content" src="${safe}" alt="${esc(alt)}" loading="lazy"></a>`;
};

const statusInfo = {
  new:['Новая','new'], in_progress:['В работе','work'], done:['Выполнено','done'], rejected:['Не можем','rejected']
};

async function user(){ const {data}=await db.auth.getUser(); return data.user; }
async function profile(){ const u=await user(); if(!u)return null; const {data}=await db.from('profiles').select('*').eq('id',u.id).maybeSingle(); return data; }
function msg(el,text,type='error'){ if(!el)return; el.className=type; el.textContent=text; el.classList.remove('hidden'); }
function hide(el){el?.classList.add('hidden')}

async function bootNav(){
  const p=await profile(), u=await user();
  const el=document.querySelector('[data-auth]');
  if(el){
    if(u){
      const displayName = p?.nickname || p?.first_name || p?.name || 'Ученик';
      const avatar = p?.avatar_emoji || '👤';
      el.innerHTML=`<div class="auth-actions"><a class="auth-user" href="profile.html">${esc(avatar)} ${nickHtml(displayName,p?.id)}</a><button class="btn logout-btn" id="logout">Выйти</button></div>`;
    } else {
      el.innerHTML=`<a class="btn primary login-btn" href="auth.html">Войти</a>`;
    }
    document.getElementById('logout')?.addEventListener('click',async()=>{await db.auth.signOut();location.href='index.html'});
  }
  document.querySelector('[data-admin-link]')?.classList.toggle('hidden',p?.role!=='admin');
}
bootNav();

async function heartbeat(){const u=await user();if(!u)return;await db.rpc('touch_presence');}
heartbeat();
setInterval(heartbeat,30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat()});

window.Portal = {db,esc,fmt,statusInfo,user,profile,msg,hide,MAIN_ADMIN_ID,nickHtml,mediaHtml};
