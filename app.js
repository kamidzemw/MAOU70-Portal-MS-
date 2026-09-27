const SUPABASE_URL = 'https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let ideas = [];
let votes = [];
let authMode = 'login';

const $ = (id) => document.getElementById(id);
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const statusLabel = {new:'Новая', in_progress:'В работе', done:'Выполнено', rejected:'Отклонено'};
const statusClass = {new:'status-new', in_progress:'status-progress', done:'status-done', rejected:'status-rejected'};

function openModal(id){ $(id).classList.remove('hidden'); }
function closeModal(id){ $(id).classList.add('hidden'); }
function setMessage(id, text, error=false){ const el=$(id); el.textContent=text; el.className='form-message '+(error?'error':'success'); }

async function loadData(){
  const [{data: ideasData, error: ideasError}, {data: votesData, error: votesError}] = await Promise.all([
    client.from('ideas').select('*').order('created_at',{ascending:false}),
    client.from('votes').select('idea_id,user_id')
  ]);
  if(ideasError){ console.error(ideasError); $('ideasGrid').innerHTML='<div class="empty">Не удалось загрузить идеи. Проверь подключение Supabase.</div>'; return; }
  if(votesError) console.error(votesError);
  ideas = ideasData || [];
  votes = votesData || [];
  renderIdeas('all'); updateStats();
}

function countVotes(id){ return votes.filter(v=>v.idea_id===id).length; }
function hasVoted(id){ return !!currentUser && votes.some(v=>v.idea_id===id && v.user_id===currentUser.id); }

function renderIdeas(filter='all'){
  const list = filter==='all' ? ideas : ideas.filter(i=>i.status===filter);
  const grid=$('ideasGrid');
  if(!list.length){ grid.innerHTML='<div class="empty">Пока здесь пусто. Будь первым, кто предложит идею 💡</div>'; return; }
  grid.innerHTML=list.map(i=>{
    const count=countVotes(i.id), voted=hasVoted(i.id);
    return `<article class="idea-card">
      <div class="idea-top"><span class="status ${statusClass[i.status]||''}">${statusLabel[i.status]||i.status}</span><span class="category">${esc(i.category||'Другое')}</span></div>
      <h3>${esc(i.title)}</h3><p>${esc(i.description)}</p>
      ${i.admin_comment?`<div class="admin-comment"><b>💬 Ответ администрации</b><div>${esc(i.admin_comment)}</div></div>`:''}
      <div class="idea-bottom"><span class="author">${esc(i.author_name||'Ученик')}</span><button class="vote ${voted?'voted':''}" data-vote="${i.id}">👍 ${count}</button></div>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-vote]').forEach(btn=>btn.addEventListener('click',()=>toggleVote(Number(btn.dataset.vote))));
}

function updateStats(){
  $('heroIdeas').textContent=ideas.length;
  $('heroVotes').textContent=votes.length;
  $('heroProgress').textContent=ideas.filter(i=>i.status==='in_progress').length;
  $('heroDone').textContent=ideas.filter(i=>i.status==='done').length;
}

async function toggleVote(ideaId){
  if(!currentUser){ openAuth('login'); setMessage('authMessage','Войди или зарегистрируйся, чтобы голосовать.',true); return; }
  const voted=hasVoted(ideaId);
  const result=voted
    ? await client.from('votes').delete().eq('idea_id',ideaId).eq('user_id',currentUser.id)
    : await client.from('votes').insert({idea_id:ideaId,user_id:currentUser.id});
  if(result.error){ console.error(result.error); alert('Не получилось изменить голос. Попробуй ещё раз.'); return; }
  await loadData();
}

function openAuth(mode='login'){
  authMode=mode;
  $('authTitle').textContent=mode==='login'?'Войти':'Регистрация';
  $('authSubtitle').textContent=mode==='login'?'Чтобы предлагать идеи и голосовать.':'Создай аккаунт ученика.';
  $('nameField').classList.toggle('hidden', mode==='login');
  $('authSubmit').textContent=mode==='login'?'Войти':'Зарегистрироваться';
  $('switchAuth').textContent=mode==='login'?'Нет аккаунта? Зарегистрироваться':'Уже есть аккаунт? Войти';
  $('authMessage').textContent=''; $('authMessage').className='form-message';
  openModal('authModal');
}

$('authBtn').addEventListener('click',()=> currentUser ? logout() : openAuth('login'));
$('heroAddBtn').addEventListener('click',()=>{ if(currentUser) openModal('ideaModal'); else { openAuth('login'); setMessage('authMessage','Сначала войди или зарегистрируйся.',true); }});
$('switchAuth').addEventListener('click',()=>openAuth(authMode==='login'?'signup':'login'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderIdeas(b.dataset.filter);}));

$('authForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('emailInput').value.trim(), password=$('passwordInput').value, name=$('nameInput').value.trim()||'Ученик';
  $('authSubmit').disabled=true;
  if(authMode==='signup'){
    const {data,error}=await client.auth.signUp({email,password,options:{data:{name}}});
    if(error){setMessage('authMessage',error.message,true);} else if(data.session){ closeModal('authModal'); } else { setMessage('authMessage','Аккаунт создан. Проверь почту и подтверди email, затем войди.',false); }
  } else {
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error) setMessage('authMessage',error.message,true); else closeModal('authModal');
  }
  $('authSubmit').disabled=false;
});

$('ideaForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser){closeModal('ideaModal');openAuth('login');return;}
  const title=$('ideaTitle').value.trim(), description=$('ideaDescription').value.trim(), category=$('ideaCategory').value;
  const {data:profile}=await client.from('profiles').select('name').eq('id',currentUser.id).maybeSingle();
  const {error}=await client.from('ideas').insert({title,description,category,author_id:currentUser.id,author_name:profile?.name||currentUser.user_metadata?.name||'Ученик'});
  if(error){console.error(error);setMessage('ideaMessage',error.message,true);return;}
  $('ideaForm').reset(); setMessage('ideaMessage','Идея опубликована! 🎉');
  await loadData(); setTimeout(()=>closeModal('ideaModal'),700);
});

async function logout(){ await client.auth.signOut(); }
async function refreshUser(){
  const {data:{session}}=await client.auth.getSession();
  currentUser=session?.user||null;
  $('authBtn').textContent=currentUser?'Выйти':'Войти';
  $('adminLink').classList.add('hidden');
  if(currentUser){
    const {data:profile}=await client.from('profiles').select('role').eq('id',currentUser.id).maybeSingle();
    if(profile?.role==='admin') $('adminLink').classList.remove('hidden');
  }
}

client.auth.onAuthStateChange(async()=>{ await refreshUser(); await loadData(); });
refreshUser().then(loadData);
