const SUPABASE_URL = 'https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const {createClient}=window.supabase; const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const statusText={new:'Новая',in_progress:'В работе',done:'Выполнено',rejected:'Отклонено'};
let ideas=[],votes=[],filter='all';
async function boot(){
 const {data:{user}}=await db.auth.getUser();
 if(!user){location.href='index.html';return;}
 const {data:profile}=await db.from('profiles').select('role,name').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin'){$('#adminGuard').innerHTML='<div class="empty">Доступ только для администратора.<br><br><a class="btn btn-secondary" href="index.html">Вернуться на сайт</a></div>';return;}
 $('#adminGuard').classList.add('hidden');$('#adminApp').classList.remove('hidden');await load();
}
async function load(){
 const [a,b]=await Promise.all([db.from('ideas').select('*').order('created_at',{ascending:false}),db.from('votes').select('idea_id,user_id')]);
 if(a.error){$('#adminIdeas').innerHTML='<div class="empty">'+esc(a.error.message)+'</div>';return}ideas=a.data||[];votes=b.data||[];stats();render();
}
function stats(){$('#statAll').textContent=ideas.length;$('#statVotes').textContent=votes.length;$('#statProgress').textContent=ideas.filter(i=>i.status==='in_progress').length;$('#statDone').textContent=ideas.filter(i=>i.status==='done').length}
function render(){const arr=filter==='all'?ideas:ideas.filter(i=>i.status===filter);if(!arr.length){$('#adminIdeas').innerHTML='<div class="empty">Идей нет.</div>';return}$('#adminIdeas').innerHTML=arr.map(i=>`<article class="admin-item" data-id="${i.id}"><div class="admin-item-head"><div><h3>${esc(i.title)}</h3><div class="small">#${i.id} · ${esc(i.author_name||'Ученик')} · ${new Date(i.created_at).toLocaleString('ru-RU')} · 👍 ${votes.filter(v=>v.idea_id===i.id).length}</div></div><span class="status ${i.status}">${statusText[i.status]}</span></div><div class="admin-fields"><div><label class="small">Название<input class="edit-title" value="${esc(i.title)}"></label><label class="small">Описание<textarea class="edit-description">${esc(i.description)}</textarea></label><label class="small">Комментарий администрации<textarea class="edit-comment" placeholder="Например: Обсуждаем с директором…">${esc(i.admin_comment||'')}</textarea></label></div><div><label class="small">Статус<select class="edit-status"><option value="new" ${i.status==='new'?'selected':''}>Новая</option><option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option><option value="done" ${i.status==='done'?'selected':''}>Выполнено</option><option value="rejected" ${i.status==='rejected'?'selected':''}>Отклонено</option></select></label></div></div><div class="admin-actions"><button class="btn btn-danger delete-btn">Удалить</button><button class="btn btn-primary save-btn">Сохранить</button></div></article>`).join('');
 document.querySelectorAll('.save-btn').forEach(b=>b.addEventListener('click',()=>save(Number(b.closest('.admin-item').dataset.id),b)));document.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click',()=>removeIdea(Number(b.closest('.admin-item').dataset.id))));}
async function save(id,btn){const box=btn.closest('.admin-item');btn.disabled=true;const payload={title:box.querySelector('.edit-title').value.trim(),description:box.querySelector('.edit-description').value.trim(),status:box.querySelector('.edit-status').value,admin_comment:box.querySelector('.edit-comment').value.trim()};const {error}=await db.from('ideas').update(payload).eq('id',id);btn.disabled=false;if(error){alert(error.message);return}await load();toast('Изменения сохранены');}
async function removeIdea(id){if(!confirm('Удалить эту идею? Это действие нельзя отменить.'))return;const {error}=await db.from('ideas').delete().eq('id',id);if(error){alert(error.message);return}await load();toast('Идея удалена');}
function toast(t){const x=document.createElement('div');x.className='toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
$('#adminFilter').addEventListener('change',e=>{filter=e.target.value;render()});$('#logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();location.href='index.html'});boot();
