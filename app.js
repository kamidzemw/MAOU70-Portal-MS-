const SUPABASE_URL = 'https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let ideas = [];
let votes = new Set();
let authMode = 'login';

function show(id) { $(id)?.classList.remove('hidden'); }
function hide(id) { $(id)?.classList.add('hidden'); }
function setMessage(id, text, type='') { const el=$(id); if(!el)return; el.textContent=text; el.className='form-message '+type; }

function statusLabel(status) {
  return {new:'Новая', in_progress:'В работе', done:'Выполнено', rejected:'Отклонено'}[status] || status;
}
function statusClass(status){ return 'status-'+status; }
function escapeHtml(str='') { return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

async function loadData(){
  const {data, error} = await supabaseClient.from('ideas').select('*').order('created_at',{ascending:false});
  if(error){ console.error(error); $('ideasGrid').innerHTML='<div class="empty">Не удалось загрузить идеи.<br><small>Проверь подключение к Supabase.</small></div>'; return; }
  ideas = data || [];
  const {data: voteRows} = await supabaseClient.from('votes').select('idea_id,user_id');
  votes = new Set((voteRows||[]).filter(v=>v.user_id===currentUser?.id).map(v=>v.idea_id));
  renderIdeas('all');
  updateStats(voteRows||[]);
}
function updateStats(voteRows){
  $('heroIdeas').textContent=ideas.length;
  $('heroVotes').textContent=voteRows.length;
  $('heroProgress').textContent=ideas.filter(i=>i.status==='in_progress').length;
  $('heroDone').textContent=ideas.filter(i=>i.status==='done').length;
}
function renderIdeas(filter){
  const grid=$('ideasGrid');
  let list=ideas.filter(i=>filter==='all'||i.status===filter);
  if(!list.length){ grid.innerHTML='<div class="empty">Пока здесь пусто. Будь первым, кто предложит идею 💡</div>'; return; }
  // Count votes from current loaded rows by fetching a count per idea is costly; use embedded query below when available.
  Promise.all(list.map(async idea=>{
    const {count}=await supabaseClient.from('votes').select('*',{count:'exact',head:true}).eq('idea_id',idea.id);
    return {...idea, voteCount:count||0};
  })).then(enriched=>{
    grid.innerHTML=enriched.map(idea=>`<article class="idea-card">
      <div class="idea-top"><span class="status ${statusClass(idea.status)}">${statusLabel(idea.status)}</span><span class="category">${escapeHtml(idea.category||'Другое')}</span></div>
      <h3>${escapeHtml(idea.title)}</h3>
      <p>${escapeHtml(idea.description)}</p>
      ${idea.admin_comment?`<div class="admin-comment"><b>💬 Комментарий администрации</b><span>${escapeHtml(idea.admin_comment)}</span></div>`:''}
      <div class="idea-bottom"><span class="author">${escapeHtml(idea.author_name||'Ученик')}</span><button class="vote-btn ${votes.has(idea.id)?'voted':''}" data-vote="${idea.id}">👍 <b>${idea.voteCount}</b></button></div>
    </article>`).join('');
    grid.querySelectorAll('[data-vote]').forEach(btn=>btn.addEventListener('click',()=>toggleVote(Number(btn.dataset.vote))));
  });
}

async function toggleVote(ideaId){
  if(!currentUser){ openAuth('login'); return; }
  const already=votes.has(ideaId);
  let result;
  if(already){ result=await supabaseClient.from('votes').delete().eq('idea_id',ideaId).eq('user_id',currentUser.id); }
  else { result=await supabaseClient.from('votes').insert({idea_id:ideaId,user_id:currentUser.id}); }
  if(result.error){ alert(result.error.message); return; }
  await loadData();
}

function openAuth(mode='login'){
  authMode=mode; $('authTitle').textContent=mode==='login'?'Войти':'Регистрация'; $('authSubmit').textContent=mode==='login'?'Войти':'Создать аккаунт';
  $('authSubtitle').textContent=mode==='login'?'Чтобы предлагать идеи и голосовать.':'Создай аккаунт ученика для предложений и голосования.';
  $('nameField').classList.toggle('hidden',mode==='login'); $('switchAuth').textContent=mode==='login'?'Нет аккаунта? Зарегистрироваться':'Уже есть аккаунт? Войти';
  setMessage('authMessage',''); show('authModal');
}
function closeModal(id){hide(id);}

async function handleAuth(e){
  e.preventDefault(); setMessage('authMessage','');
  const email=$('emailInput').value.trim(), password=$('passwordInput').value, name=$('nameInput').value.trim();
  let res;
  if(authMode==='login') res=await supabaseClient.auth.signInWithPassword({email,password});
  else res=await supabaseClient.auth.signUp({email,password,options:{data:{name:name||'Ученик'}}});
  if(res.error){setMessage('authMessage',res.error.message,'error');return;}
  if(authMode==='login'){ hide('authModal'); }
  else { setMessage('authMessage','Аккаунт создан. Если Supabase попросил подтвердить почту — подтверди её, затем войди.','success'); }
}

async function refreshUser(){
  const {data:{user}}=await supabaseClient.auth.getUser(); currentUser=user||null;
  if(currentUser){
    const {data}=await supabaseClient.from('profiles').select('*').eq('id',currentUser.id).maybeSingle(); currentProfile=data;
    $('authBtn').textContent='Выйти';
    if(currentProfile?.role==='admin') show('adminLink'); else hide('adminLink');
  } else { currentProfile=null; $('authBtn').textContent='Войти'; hide('adminLink'); }
  await loadData();
}

$('authBtn')?.addEventListener('click',async()=>{ if(currentUser){await supabaseClient.auth.signOut();}else openAuth('login'); });
$('heroAddBtn')?.addEventListener('click',()=>{ if(!currentUser){openAuth('login');return;} show('ideaModal'); });
$('authForm')?.addEventListener('submit',handleAuth);
$('switchAuth')?.addEventListener('click',()=>openAuth(authMode==='login'?'signup':'login'));
$('ideaForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!currentUser){openAuth('login');return;}
  const title=$('ideaTitle').value.trim(), description=$('ideaDescription').value.trim(), category=$('ideaCategory').value;
  if(!title||!description)return;
  const {error}=await supabaseClient.from('ideas').insert({title,description,category,status:'new',author_id:currentUser.id,author_name:currentProfile?.name||currentUser.user_metadata?.name||'Ученик'});
  if(error){setMessage('ideaMessage',error.message,'error');return;}
  $('ideaForm').reset(); setMessage('ideaMessage','Идея опубликована!','success'); setTimeout(()=>hide('ideaModal'),600); await loadData();
});
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.dataset.close)));
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)hide(m.id)}));
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderIdeas(btn.dataset.filter)}));

supabaseClient.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
refreshUser();
