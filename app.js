const SUPABASE_URL = 'https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let ideas = [];
let votes = [];
let currentFilter = 'all';
let authMode = 'login';

const $ = (s) => document.querySelector(s);
const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const statusText = {new:'Новая',in_progress:'В работе',done:'Выполнено',rejected:'Отклонено'};
const dateText = d => new Date(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});

async function loadData(){
  const [{data:ideaData,error:ideaError},{data:voteData,error:voteError}] = await Promise.all([
    db.from('ideas').select('*').order('created_at',{ascending:false}),
    db.from('votes').select('idea_id,user_id')
  ]);
  if(ideaError){ console.error(ideaError); $('#ideasGrid').innerHTML='<div class="empty">Не удалось загрузить идеи. Проверь подключение Supabase.</div>'; return; }
  if(voteError) console.error(voteError);
  ideas=ideaData||[]; votes=voteData||[]; renderStats(); renderIdeas();
}
function renderStats(){
  $('#heroIdeas').textContent=ideas.length;
  $('#heroVotes').textContent=votes.length;
  $('#heroProgress').textContent=ideas.filter(x=>x.status==='in_progress').length;
  $('#heroDone').textContent=ideas.filter(x=>x.status==='done').length;
}
function countVotes(id){return votes.filter(v=>v.idea_id===id).length}
function hasVoted(id,userId){return votes.some(v=>v.idea_id===id&&v.user_id===userId)}
async function renderIdeas(){
  const user=(await db.auth.getUser()).data.user;
  const filtered=currentFilter==='all'?ideas:ideas.filter(i=>i.status===currentFilter);
  if(!filtered.length){$('#ideasGrid').innerHTML='<div class="empty">Пока здесь пусто. Можно стать первым 😉</div>';return;}
  $('#ideasGrid').innerHTML=filtered.map(i=>{
    const voted=user?hasVoted(i.id,user.id):false;
    return `<article class="idea-card">
      <div class="idea-top"><span class="status ${i.status}">${statusText[i.status]||i.status}</span><span class="small muted">${escapeHtml(i.category||'Другое')}</span></div>
      <h3>${escapeHtml(i.title)}</h3><p>${escapeHtml(i.description)}</p>
      ${i.admin_comment?`<div class="admin-comment">💬 ${escapeHtml(i.admin_comment)}</div>`:''}
      <div class="idea-meta"><span>${escapeHtml(i.author_name||'Ученик')} · ${dateText(i.created_at)}</span><button class="vote-btn ${voted?'voted':''}" data-vote="${i.id}">👍 ${countVotes(i.id)}</button></div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',()=>toggleVote(Number(b.dataset.vote))));
}
async function toggleVote(id){
  const {data:{user}}=await db.auth.getUser();
  if(!user){openAuth();return;}
  const existing=votes.find(v=>v.idea_id===id&&v.user_id===user.id);
  const result=existing?await db.from('votes').delete().eq('idea_id',id).eq('user_id',user.id):await db.from('votes').insert({idea_id:id,user_id:user.id});
  if(result.error){showToast(result.error.message);return;}
  await loadData();
}
function openModal(id){$(id).classList.remove('hidden')}
function closeModal(id){$(id).classList.add('hidden')}
function openAuth(){openModal('authModal')}
function setAuthMode(mode){authMode=mode;$('#authTitle').textContent=mode==='login'?'Войти':'Регистрация';$('#authSubmit').textContent=mode==='login'?'Войти':'Создать аккаунт';$('#nameField').classList.toggle('hidden',mode==='login');$('#switchAuth').textContent=mode==='login'?'Нет аккаунта? Зарегистрироваться':'Уже есть аккаунт? Войти';$('#authMessage').textContent=''}
async function refreshAuth(){
  const {data:{user}}=await db.auth.getUser();
  if(user){$('#authBtn').textContent='Выйти';$('#adminLink').classList.remove('hidden');const {data:p}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(p?.role==='admin')$('#adminLink').classList.remove('hidden');else $('#adminLink').classList.add('hidden');}
  else{$('#authBtn').textContent='Войти';$('#adminLink').classList.add('hidden')}
  renderIdeas();
}
async function authSubmit(e){
  e.preventDefault(); const email=$('#emailInput').value.trim();const password=$('#passwordInput').value;const name=$('#nameInput').value.trim()||'Ученик';$('#authMessage').textContent='';
  let result;
  if(authMode==='login') result=await db.auth.signInWithPassword({email,password});
  else result=await db.auth.signUp({email,password,options:{data:{name}}});
  if(result.error){$('#authMessage').textContent=result.error.message;return;}
  if(authMode==='signup' && !result.data.session){$('#authMessage').textContent='Аккаунт создан. Если Supabase просит подтверждение почты — подтверди её и войди.';return;}
  closeModal('authModal');e.target.reset();await refreshAuth();
}
async function addIdea(e){
  e.preventDefault();const {data:{user}}=await db.auth.getUser();if(!user){closeModal('ideaModal');openAuth();return;}
  const title=$('#ideaTitle').value.trim(),description=$('#ideaDescription').value.trim(),category=$('#ideaCategory').value;
  const {data:p}=await db.from('profiles').select('name').eq('id',user.id).maybeSingle();
  const {error}=await db.from('ideas').insert({title,description,category,status:'new',author_id:user.id,author_name:p?.name||user.user_metadata?.name||'Ученик'});
  if(error){$('#ideaMessage').textContent=error.message;return;}
  $('#ideaForm').reset();closeModal('ideaModal');await loadData();location.hash='ideas';showToast('Идея опубликована 💡');
}
function showToast(msg){const x=document.createElement('div');x.className='toast';x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),2500)}

document.addEventListener('DOMContentLoaded',async()=>{
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  $('#authBtn').addEventListener('click',async()=>{const {data:{user}}=await db.auth.getUser();if(user){await db.auth.signOut();await refreshAuth();}else openAuth()});
  $('#heroAddBtn').addEventListener('click',async()=>{const {data:{user}}=await db.auth.getUser();if(user)openModal('ideaModal');else openAuth()});
  $('#switchAuth').addEventListener('click',()=>setAuthMode(authMode==='login'?'signup':'login'));
  $('#authForm').addEventListener('submit',authSubmit);$('#ideaForm').addEventListener('submit',addIdea);
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;renderIdeas()}));
  await loadData();await refreshAuth();
  db.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0));
});
