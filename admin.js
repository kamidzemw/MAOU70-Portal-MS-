const SUPABASE_URL='https://xshennhqddkslbunummb.supabase.co';
const SUPABASE_KEY='sb_publishable_nFZE7LV2GQFqiHkMWkiNQg_X1i9me4l';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function init(){
 const {data:{user}}=await supabaseClient.auth.getUser();
 if(!user){location.href='index.html';return;}
 const {data:profile}=await supabaseClient.from('profiles').select('*').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin'){document.body.innerHTML='<main class="center-page"><div class="modal-box"><h2>Нет доступа</h2><p>Эта страница доступна только администратору.</p><a class="btn btn-primary" href="index.html">На главную</a></div></main>';return;}
 await load();
}
async function load(){
 const {data:ideas,error}=await supabaseClient.from('ideas').select('*').order('created_at',{ascending:false});
 if(error){$('adminGrid').innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
 const rows=await Promise.all((ideas||[]).map(async i=>{const {count}=await supabaseClient.from('votes').select('*',{count:'exact',head:true}).eq('idea_id',i.id);return {...i,voteCount:count||0};}));
 $('adminGrid').innerHTML=rows.map(i=>`<article class="admin-card"><div class="admin-card-head"><div><span class="status status-${i.status}">${esc(i.status==='new'?'Новая':i.status==='in_progress'?'В работе':i.status==='done'?'Выполнено':'Отклонено')}</span><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p><small>${esc(i.author_name||'Ученик')} · 👍 ${i.voteCount}</small></div><button class="btn btn-danger" data-del="${i.id}">Удалить</button></div><label>Статус<select data-status="${i.id}"><option value="new" ${i.status==='new'?'selected':''}>Новая</option><option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option><option value="done" ${i.status==='done'?'selected':''}>Выполнено</option><option value="rejected" ${i.status==='rejected'?'selected':''}>Отклонено</option></select></label><label>Комментарий администрации<textarea data-comment="${i.id}" placeholder="Например: Обсудили на совете...">${esc(i.admin_comment||'')}</textarea><button class="btn btn-primary" data-save="${i.id}">Сохранить изменения</button></article>`).join('')||'<div class="empty">Идей пока нет.</div>';
 document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>save(Number(b.dataset.save)));
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(Number(b.dataset.del)));
}
async function save(id){const status=document.querySelector(`[data-status="${id}"]`).value;const admin_comment=document.querySelector(`[data-comment="${id}"]`).value;const {error}=await supabaseClient.from('ideas').update({status,admin_comment}).eq('id',id);if(error)alert(error.message);else await load();}
async function del(id){if(!confirm('Удалить эту идею?'))return;const {error}=await supabaseClient.from('ideas').delete().eq('id',id);if(error)alert(error.message);else await load();}
$('backBtn')?.addEventListener('click',()=>location.href='index.html');
$('logoutBtn')?.addEventListener('click',async()=>{await supabaseClient.auth.signOut();location.href='index.html';});
init();
