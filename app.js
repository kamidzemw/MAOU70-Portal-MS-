const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt = d => new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d));
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
    if(u) el.innerHTML=`<a href="profile.html">👤 ${esc(p?.first_name||p?.name||'Профиль')}</a><button class="btn" id="logout">Выйти</button>`;
    else el.innerHTML=`<a class="btn primary" href="auth.html">Войти</a>`;
    document.getElementById('logout')?.addEventListener('click',async()=>{await db.auth.signOut();location.href='index.html'});
  }
  document.querySelector('[data-admin-link]')?.classList.toggle('hidden',p?.role!=='admin');
}
bootNav();

window.Portal = {db,esc,fmt,statusInfo,user,profile,msg,hide};
