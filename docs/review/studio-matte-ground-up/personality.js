// Local interaction prototype. Photo bytes never leave the browser.
state.identity={name:'A celebration of service',occasion:'Retirement gathering',moment:'Time for recognition. Time for family. No rushed speeches.',photo:null};
let pendingPhoto=null,photoBusy=false;
const beforePersonality=render;
render=function(){beforePersonality();if(state.scenario!=='normal')return;
 const r=route(),id=state.identity;
 document.querySelectorAll('.eventtitle,.eventpick strong').forEach(el=>el.textContent=id.name);
 if(r==='overview'){
  const head=main.querySelector('.pagehead');head.querySelector('p').textContent=id.occasion;
  main.querySelector('.hero .preview-actions').insertAdjacentHTML('beforeend',btn('Make it yours','personalize','identity-edit'));
  const memory=[...main.querySelectorAll('section')].find(el=>el.querySelector('h2')?.textContent==='Remember what matters');
  if(memory){memory.classList.add('personal-moment');memory.innerHTML=`${id.photo?`<img class="event-photo" src="${id.photo}" alt="Your chosen event photograph">`:'<div class="photo-placeholder" aria-hidden="true">Your people. Your moment.</div>'}<div class="moment-copy"><span class="eyebrow">The moment to protect</span><h2>${esc(id.moment)}</h2><p>${esc(id.name)} · ${esc(id.occasion)}</p>${btn(id.photo?'Edit your event':'Add your photograph','personalize')}</div>`}
  const hero=main.querySelector('.hero');
  if(!state.venue){hero.querySelector('.preview-actions')?.insertAdjacentHTML('beforeend',btn('Record venue confirmation','confirm'))}
  if(state.receipt){hero.classList.add('completion-card');hero.tabIndex=-1;hero.querySelector('h2').textContent='Place secured. What’s next?';hero.querySelector('p').textContent='Confirmation recorded in this sample. Food and setup decisions can now move forward.';}
 }
 if(r==='venue'&&state.receipt){
  const card=main.querySelector('#venue-agreement');card.classList.add('completion-card');card.tabIndex=-1;
  card.innerHTML=`<div class="completion-mark" aria-hidden="true">${icon('check')}</div><span class="eyebrow">Confirmation recorded · Sample</span><h2>Place secured.</h2><p>Your food and setup decisions can move forward.</p><div class="next-decision"><span class="eyebrow">Your next decision</span><h3>Give dinner a final shape.</h3><p>Review the menu and dietary needs before agreeing to an order.</p>${btn('Review the food plan '+icon('arrow'),'food','primary')}${btn('Review setup','day')}</div><div class="between"><span class="muted">Same plan. One step forward.</span>${btn('Undo confirmation','undo-confirm')}</div>`;
  card.insertAdjacentHTML('beforeend',btn('Prepare this for me','assist'));
  if(state.completionMotion){state.completionMotion=false;animateElement(card,[{opacity:.35,transform:'scale(.97)'},{opacity:1,transform:'scale(1)'}],420);animateElement(card.querySelector('.completion-mark'),[{transform:'scale(.5)',opacity:0},{transform:'scale(1)',opacity:1}],480)}
 }
 if(r==='decisions'){
  const card=main.querySelector('#decision-card'),choice=state.choices[state.decisionIndex];
  const deck=document.createElement('div');deck.className='decision-deck';card.before(deck);deck.append(card);card.dataset.choice=choice||'';
  const status=card.querySelector('#choice-status');status.parentElement.classList.add('selection-receipt');
  card.querySelector('[data-action=choice-keep]').setAttribute('aria-pressed',String(choice==='Shortlisted'));
  card.querySelector('[data-action=choice-later]').setAttribute('aria-pressed',String(choice==='Not now'));
  const summary=main.querySelector('.board aside h2');summary.textContent=`Your shortlist · ${Object.values(state.choices).filter(x=>x==='Shortlisted').length}`;
 }
 if(r==='ceremony'||r==='food'){const note=document.createElement('div');note.className='moment-note';note.textContent='Your must-have moment: '+id.moment;main.querySelector('.pagehead').after(note)}
};
actions.personalize=()=>{pendingPhoto=state.identity.photo;photoBusy=false;modal('Make this event yours',`<form id="identity-form"><label class="field">Event name<input class="input" name="eventName" maxlength="70" required value="${esc(state.identity.name)}"></label><label class="field">Occasion<input class="input" name="occasion" maxlength="60" required value="${esc(state.identity.occasion)}"></label><label class="field">The moment you must have<textarea class="input" name="moment" maxlength="180" rows="3" required>${esc(state.identity.moment)}</textarea></label><label class="field">Your photograph<input type="file" id="event-photo-file" accept="image/jpeg,image/png,image/webp"></label><div id="photo-preview">${pendingPhoto?`<img class="photo-editor" src="${pendingPhoto}" alt="Current event photograph">`:''}</div><p id="photo-status" role="status">JPEG, PNG or WebP, up to 10 MB. Kept in this tab only; cleared on reload.</p>${btn('Remove photograph','remove-photo')}<div class="actionfoot"><button class="btn primary" type="submit">Save event personality</button>${btn('Cancel','close')}</div></form>`)};
actions['remove-photo']=()=>{if(pendingPhoto&&pendingPhoto!==state.identity.photo)URL.revokeObjectURL(pendingPhoto);pendingPhoto=null;document.querySelector('#photo-preview').innerHTML='';document.querySelector('#photo-status').textContent='Photograph removed from this draft. Save to apply.'};
document.addEventListener('click',e=>{if(e.target.closest('[data-action=remove-photo]')){e.preventDefault();e.stopImmediatePropagation();actions['remove-photo']()}},true);
document.addEventListener('change',async e=>{if(e.target.id!=='event-photo-file')return;const file=e.target.files[0];if(!file)return;const status=document.querySelector('#photo-status'),save=document.querySelector('#identity-form [type=submit]');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status.textContent='Choose a JPEG, PNG or WebP smaller than 10 MB.';e.target.value='';return}
 photoBusy=true;save.disabled=true;status.textContent='Loading your photograph…';const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();if(!document.querySelector('#identity-form')){URL.revokeObjectURL(url);return}if(pendingPhoto&&pendingPhoto!==state.identity.photo)URL.revokeObjectURL(pendingPhoto);pendingPhoto=url;document.querySelector('#photo-preview').innerHTML=`<img class="photo-editor" src="${url}" alt="Selected event photograph">`;status.textContent='Ready. Save to add this photograph to your event.'}catch{URL.revokeObjectURL(url);status.textContent='This image could not be opened. Choose another file.'}finally{photoBusy=false;save.disabled=false}
});
document.addEventListener('submit',e=>{if(e.target.id!=='identity-form')return;e.preventDefault();if(photoBusy)return;const data=new FormData(e.target);const name=data.get('eventName').trim(),occasion=data.get('occasion').trim(),moment=data.get('moment').trim();if(!name||!occasion||!moment){toast('Add an event name, occasion and moment.');return}if(state.identity.photo&&state.identity.photo!==pendingPhoto)URL.revokeObjectURL(state.identity.photo);state.identity={name,occasion,moment,photo:pendingPhoto};close();render();toast('Your event, made personal. Saved for this tab.');});
dialog.addEventListener('close',()=>{if(pendingPhoto&&pendingPhoto!==state.identity.photo){URL.revokeObjectURL(pendingPhoto);pendingPhoto=null}});
const v3Review=actions.review;actions.review=()=>{v3Review();const p=dialog.querySelector('.dialogbody>p');p.textContent='Interaction revision 4 · Mouse, keyboard or touch. Personalization is local; live AI is not connected.';dialog.querySelector('.demo-examples').insertAdjacentHTML('beforeend',`<button class="btn" data-action="personalize"><strong>5 · Make it yours</strong><span>Add your photograph, occasion and must-have moment.</span></button>`)};
document.querySelector('.preview [data-action=review]').textContent='Try demo · v4';
render();
