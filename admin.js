const SUPABASE_URL = 'https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const labels={new:'Новая',in_progress:'В работе',done:'Выполнено',rejected:'Отклонено'};
let allIdeas=[], votes=[];

async function init(){
  const {data:{session}}=await client.auth.getSession();
  if(!session){ $('adminGuard').textContent='Сначала войди в аккаунт администратора.'; return; }
  const {data:profile}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
  if(profile?.role!=='admin'){ $('adminGuard').textContent='Доступ запрещён. Этот раздел только для администратора.'; return; }
  $('adminGuard').classList.add('hidden'); $('adminApp').classList.remove('hidden');
  await load();
}

async function load(){
  const [{data:ideas,error},{data:v}]=await Promise.all([
    client.from('ideas').select('*').order('created_at',{ascending:false}),
    client.from('votes').select('idea_id')
  ]);
  if(error){ $('adminIdeas').innerHTML='<div class="empty">Ошибка загрузки: '+esc(error.message)+'</div>'; return; }
  allIdeas=ideas||[]; votes=v||[];
  $('statAll').textContent=allIdeas.length; $('statVotes').textContent=votes.length;
  $('statProgress').textContent=allIdeas.filter(i=>i.status==='in_progress').length;
  $('statDone').textContent=allIdeas.filter(i=>i.status==='done').length;
  render();
}
function count(id){return votes.filter(v=>v.idea_id===id).length;}
function render(){
  const filter=$('adminFilter').value; const list=filter==='all'?allIdeas:allIdeas.filter(i=>i.status===filter);
  $('adminIdeas').innerHTML=list.map(i=>`<article class="admin-card" data-id="${i.id}">
    <div class="admin-card-main"><div class="idea-top"><span class="status status-${i.status==='in_progress'?'progress':i.status}">${labels[i.status]}</span><span class="category">${esc(i.category)}</span></div>
    <h3>${esc(i.title)}</h3><p>${esc(i.description)}</p><small>Автор: ${esc(i.author_name||'Ученик')} · 👍 ${count(i.id)}</small></div>
    <div class="admin-controls"><label>Статус<select class="status-select"><option value="new" ${i.status==='new'?'selected':''}>Новая</option><option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option><option value="done" ${i.status==='done'?'selected':''}>Выполнено</option><option value="rejected" ${i.status==='rejected'?'selected':''}>Отклонено</option></select></label>
    <label>Комментарий<textarea class="comment-input" placeholder="Ответ администрации...">${esc(i.admin_comment||'')}</textarea></label>
    <button class="btn btn-primary save-btn">Сохранить</button><button class="btn btn-danger delete-btn">Удалить</button></div>
  </article>`).join('') || '<div class="empty">Нет идей.</div>';
  document.querySelectorAll('.admin-card').forEach(card=>{
    card.querySelector('.save-btn').onclick=()=>save(card);
    card.querySelector('.delete-btn').onclick=()=>remove(card);
  });
}
async function save(card){
  const id=Number(card.dataset.id), status=card.querySelector('.status-select').value, admin_comment=card.querySelector('.comment-input').value.trim();
  const {error}=await client.from('ideas').update({status,admin_comment}).eq('id',id);
  if(error){alert('Ошибка: '+error.message);return;} await load();
}
async function remove(card){
  if(!confirm('Удалить эту идею?'))return;
  const {error}=await client.from('ideas').delete().eq('id',Number(card.dataset.id));
  if(error){alert('Ошибка: '+error.message);return;} await load();
}
$('adminFilter').addEventListener('change',render);
$('logoutBtn').addEventListener('click',async()=>{await client.auth.signOut();location.href='index.html';});
client.auth.onAuthStateChange(()=>init());
init();
