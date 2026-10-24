import {isKnownMaleBengaliVoice} from './voice-policy.mjs';
import {filterTracks,adjacent,trustedAudio} from './recording-core.mjs';
const $=s=>document.querySelector(s),bn=n=>Number(n).toLocaleString('bn-BD');
const audio=$('#audio'),synth=window.speechSynthesis;
let tracks=[],filtered=[],chapters=[],selected=null,shown=60,request=0,textRequest=0,activeText='',textPromise=Promise.resolve(''),speechState='stopped',utterance,voices=[];
const textCache=new Map();
let desiredVoice; 
const status=s=>{const el=$('#status');el.textContent=s;const error=/পাওয়া যায়নি|পাওয়া যাচ্ছে না|চালু হয়নি|চালানো যায়নি|লোড করতে সমস্যা|সংযোগ পরীক্ষা|আবার চেষ্টা|NotAllowedError/.test(s);el.classList.toggle('visually-hidden',!error);el.classList.toggle('player-alert',error)};
const save=(k,v)=>{try{localStorage.setItem('recorded-'+k,JSON.stringify(v))}catch{}};
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem('recorded-'+k))??d}catch{return d}};
const chapterName=id=>chapters.find(c=>c.id===id)?.name||'উৎসে অধ্যায় অনুল্লেখিত';
const recorded=()=>$('#voice').value==='recorded';
let volume=Math.max(0,Math.min(100,Number(read('volume',100))||0)),muted=!!read('muted',false);
function clock(s){if(!Number.isFinite(s))return '—';const n=Math.floor(s);return bn(Math.floor(n/60))+':'+String(n%60).padStart(2,'0').replace(/[0-9]/g,c=>'০১২৩৪৫৬৭৮৯'[Number(c)])}
function buttons(){const playing=recorded()?!audio.paused:speechState==='playing';$('#play').textContent=playing?'Ⅱ বিরতি':'▶ শুনুন';$('#listen').textContent=playing?'Ⅱ বিরতি দিন':'▶ এই হাদিস শুনুন'}
function stop(){request++;audio.pause();synth?.cancel();speechState='stopped';if(audio.readyState)audio.currentTime=0;buttons()}
function bookmark(){const marked=read('bookmark',null)===selected?.id;$('#bookmark').textContent=marked?'★ মনে রাখা আছে':'☆ মনে রাখুন'}
function renderList(){const box=$('#list');box.replaceChildren();for(const t of filtered.slice(0,shown)){const b=document.createElement('button');b.className='row'+(selected===t?' selected':'');b.setAttribute('aria-pressed',String(selected===t));const a=document.createElement('strong');a.textContent='হাদিস '+bn(t.id);const s=document.createElement('span');s.textContent=chapterName(t.chapter);b.append(a,s);b.onclick=()=>choose(t);box.append(b)}if(!filtered.length)box.textContent='এই নম্বরের রেকর্ডিং পাওয়া যায়নি।';$('#count').textContent=bn(filtered.length);$('#more').hidden=shown>=filtered.length}
async function loadText(t){
 const id=++textRequest;activeText='';$('#hadith-text').setAttribute('aria-busy','true');$('#hadith-text').textContent='হাদিসের পাঠ লোড হচ্ছে…';$('#retry-text').hidden=true;
 try{
  let text=textCache.get(t.id);
  if(!text){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
   let rows;try{const r=await fetch('https://hadisbangla.com/backend/parseChapterHadiths.php?kitab=bukhari&start='+encodeURIComponent(t.id)+'&end='+encodeURIComponent(t.id),{signal:controller.signal});if(!r.ok)throw Error();rows=await r.json()}finally{clearTimeout(timeout)}
   const match=Array.isArray(rows)&&rows.find(h=>String(h.serial)===t.id&&h.audio===t.url);
   if(!match||typeof match.hadis!=='string'||!match.hadis.trim())throw Error();
   text=match.hadis.trim();textCache.set(t.id,text);
  }
  if(id!==textRequest)return '';
  activeText=text;$('#hadith-text').textContent=text;return text;
 }catch{if(id===textRequest){$('#hadith-text').textContent='এই হাদিসের পাঠ এখন লোড করা যায়নি। আবার চেষ্টা করুন অথবা উৎসের অধ্যায় খুলুন।';$('#retry-text').hidden=false}return ''}
 finally{if(id===textRequest)$('#hadith-text').setAttribute('aria-busy','false')}
}
function choose(t){closeMobileSidebar();stop();selected=t;audio.src=t.url;audio.load();audio.playbackRate=Number($('#rate').value);$('#title').textContent='হাদিস '+bn(t.id);$('#chapter').textContent=chapterName(t.chapter);$('#reference').textContent='অডিও বাংলা হাদিস সংস্করণ · '+chapterName(t.chapter);$('#playing-title').textContent='হাদিস '+bn(t.id);$('#source').href=t.chapter==='0'?'https://www.hadisbangla.com/':'https://www.hadisbangla.com/chapters/bukhari/'+t.chapter;$('#play').disabled=false;$('#listen').disabled=false;$('#seek').disabled=true;$('#seek').value=0;$('#duration').textContent='—';$('#elapsed').textContent='০:০০';save('last',t.id);bookmark();renderList();history.replaceState(null,'','#audio-'+t.id);textPromise=loadText(t);status('হাদিস পড়ুন অথবা শুনতে ▶ চাপুন।')}
function chunks(text){const out=[];let part='';for(const word of text.split(/\s+/)){if(part.length+word.length>170&&part){out.push(part);part=''}part+=(part?' ':'')+word}if(part)out.push(part);return out}
async function play(){
 if(!selected)return;
 if(recorded()){
  const id=++request;if(!audio.paused){audio.pause();return}status('উৎস থেকে অডিও লোড হচ্ছে…');try{await audio.play();if(id!==request)return;buttons()}catch(e){if(id!==request)return;buttons();status(e.name==='NotAllowedError'?'প্লেব্যাক শুরু করতে আবার ▶ চাপুন।':'অডিও চালু হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন বা উৎসের অধ্যায় খুলুন।')}return;
 }
 if(speechState==='playing'){synth.pause();speechState='paused';buttons();status('ডিভাইসের কণ্ঠে পাঠ বিরতিতে আছে।');return}
 if(speechState==='paused'){synth.resume();speechState='playing';buttons();status('ডিভাইসের কণ্ঠে পাঠ চলছে।');return}
 const voice=voices.find(v=>v.voiceURI===$('#voice').value);if(!voice){status('এই বাংলা কণ্ঠ এখন পাওয়া যাচ্ছে না। মূল রেকর্ডিং বেছে নিন।');return}
 stop();const id=request;status('পাঠ প্রস্তুত হচ্ছে…');const text=activeText||await textPromise;if(id!==request)return;
 if(!text){status('এই হাদিসের পাঠ পাওয়া যায়নি। মূল রেকর্ডিং বেছে শুনুন বা পাঠ আবার লোড করুন।');return}
 const parts=chunks(text);let index=0;speechState='playing';buttons();$('#seek').disabled=true;
 function run(){if(id!==request)return;if(index===parts.length){speechState='stopped';buttons();if($('#auto').checked)move(1,true);else status('পাঠ শেষ হয়েছে।');return}
 utterance=new SpeechSynthesisUtterance(parts[index++]);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=Number($('#rate').value);utterance.volume=muted?0:volume/100;
 utterance.onend=()=>{if(id===request)run()};utterance.onerror=e=>{if(id===request){stop();status('ডিভাইসের কণ্ঠে পাঠ চালানো যায়নি ('+e.error+')। আবার শুনুন চাপুন।')}};
 $('#elapsed').textContent='অংশ '+bn(index);$('#duration').textContent=bn(parts.length);$('#seek').value=(index-1)/parts.length*100;status('ডিভাইসের যন্ত্রকণ্ঠে পাঠ চলছে। উচ্চারণ ভুল হতে পারে।');synth.speak(utterance)
 }run();
}
function move(delta,autoplay=false){const t=adjacent(filtered,selected?.id,delta);if(!t){stop();status(delta>0?'এই তালিকার শেষ হাদিস।':'এই তালিকার প্রথম হাদিস।');return}choose(t);if(autoplay)play()}
function applyFilter(){stop();filtered=filterTracks(tracks,$('#category').value,$('#search').value);shown=60;renderList();status('তালিকা আপডেট হয়েছে। একটি হাদিস বেছে নিন।')}
function syncSound(){audio.volume=volume/100;audio.muted=muted;$('#volume').value=volume;$('#volume-value').textContent=bn(volume)+'%';$('#mute').textContent=muted?'🔇':'🔊';$('#mute').setAttribute('aria-pressed',String(muted));$('#mute').setAttribute('aria-label',muted?'শব্দ চালু করুন':'শব্দ বন্ধ করুন');save('volume',volume);save('muted',muted)}
function soundChanged(){syncSound();if(!recorded()&&speechState!=='stopped'){stop();status('ভলিউম বদলেছে। নতুন ভলিউমে পাঠ শুরু করতে ▶ চাপুন।')}}
$('#volume').oninput=()=>{volume=Number($('#volume').value);if(volume>0)muted=false;soundChanged()};$('#mute').onclick=()=>{muted=!muted;soundChanged()};syncSound();
if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1))$('#volume-help').textContent='iPhone/iPad-এ প্রয়োজন হলে পাশের ভলিউম বোতাম ব্যবহার করুন।';
function updateVoiceNote(){const isRecorded=recorded();$('#voice-badge').textContent=isRecorded?'মূল রেকর্ড করা পুরুষ কণ্ঠ':'ডিভাইসের যন্ত্রকণ্ঠে বাংলা পাঠ';$('#seek').disabled=!isRecorded||!Number.isFinite(audio.duration);}
function populateVoices(){const previous=desiredVoice??read('voice','recorded');const all=synth?.getVoices()||[];voices=[...new Map(all.filter(isKnownMaleBengaliVoice).map(v=>[v.voiceURI,v])).values()];$('#voice').replaceChildren(new Option('মূল রেকর্ডিং · পুরুষ','recorded'));for(const v of voices){const gender=' · পুরুষ';$('#voice').add(new Option(v.name+gender+' · ডিভাইস ('+v.lang+')',v.voiceURI))}const exists=voices.some(v=>v.voiceURI===previous);$('#voice').value=exists?previous:'recorded';if(previous!=='recorded'&&!exists&&speechState!=='stopped')stop();updateVoiceNote();buttons()}
if(synth)synth.onvoiceschanged=populateVoices;populateVoices();
$('#voice').onchange=()=>{stop();desiredVoice=$('#voice').value;save('voice',desiredVoice);updateVoiceNote();$('#seek').value=0;$('#elapsed').textContent='০:০০';$('#duration').textContent=recorded()?clock(audio.duration):'—';status('কণ্ঠ নির্বাচন করা হয়েছে। শুনতে ▶ চাপুন।')};
$('#toggle-text').onclick=()=>{const hidden=!$('#hadith-text').hidden;$('#hadith-text').hidden=hidden;$('#toggle-text').textContent=hidden?'হাদিস দেখুন':'পাঠ লুকান';$('#toggle-text').setAttribute('aria-expanded',String(!hidden))};$('#retry-text').onclick=()=>{if(selected)textPromise=loadText(selected)};
$('#category').onchange=applyFilter;$('#search').oninput=applyFilter;$('#more').onclick=()=>{shown+=60;renderList()};$('#play').onclick=$('#listen').onclick=play;$('#stop').onclick=()=>{stop();status('পাঠ বন্ধ হয়েছে।')};$('#prev').onclick=()=>move(-1);$('#next').onclick=()=>move(1);
$('#bookmark').onclick=()=>{if(selected){save('bookmark',selected.id);bookmark();status('এই হাদিস মনে রাখা হয়েছে।')}};
$('#rate').onchange=()=>{audio.playbackRate=Number($('#rate').value);save('rate',$('#rate').value);if(!recorded()&&speechState!=='stopped'){stop();status('গতি বদলেছে। নতুন করে শুনুন চাপুন।')}};$('#auto').checked=read('auto',true);$('#auto').onchange=()=>save('auto',$('#auto').checked);$('#rate').value=read('rate','1');
$('#seek').oninput=()=>{if(recorded()&&Number.isFinite(audio.duration))audio.currentTime=Number($('#seek').value)/100*audio.duration};
audio.addEventListener('loadedmetadata',()=>{if(recorded()){$('#duration').textContent=clock(audio.duration);$('#seek').disabled=!Number.isFinite(audio.duration)}});
audio.addEventListener('timeupdate',()=>{if(!recorded())return;$('#elapsed').textContent=clock(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)$('#seek').value=audio.currentTime/audio.duration*100});
audio.addEventListener('playing',()=>{if(recorded()){buttons();status('মানুষের রেকর্ড করা বাংলা পাঠ চলছে।')}});audio.addEventListener('pause',()=>{if(recorded()){buttons();if(audio.currentTime>0&&!audio.ended)status('প্লেব্যাক বিরতিতে আছে।')}});audio.addEventListener('waiting',()=>{if(recorded())status('অডিও বাফার হচ্ছে…')});
audio.addEventListener('error',()=>{if(recorded()){buttons();status('উৎসের অডিও পাওয়া যাচ্ছে না। আবার ▶ চাপুন বা উৎসের অধ্যায় খুলুন।')}});
audio.addEventListener('ended',()=>{if(!recorded())return;buttons();if($('#auto').checked)move(1,true);else status('রেকর্ডিং শেষ হয়েছে।')});
if('mediaSession' in navigator){navigator.mediaSession.setActionHandler('play',()=>{if(recorded()?audio.paused:speechState!=='playing')play()});navigator.mediaSession.setActionHandler('pause',()=>{if(recorded())audio.pause();else if(speechState==='playing')play()});navigator.mediaSession.setActionHandler('nexttrack',()=>move(1,true));navigator.mediaSession.setActionHandler('previoustrack',()=>move(-1,true));}
window.addEventListener('pagehide',()=>{stop();textRequest++});
fetch('recordings.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(raw=>{chapters=raw.chapters;tracks=raw.tracks.filter(t=>trustedAudio(t.url));filtered=tracks;$('#total').textContent=bn(tracks.length);$('#chapter-count').textContent=bn(chapters.length)+'টি অধ্যায় · বাংলা পাঠ ও অডিও';for(const c of chapters)$('#category').add(new Option(bn(c.id)+'. '+c.name,c.id));if(tracks.some(t=>t.chapter==='0'))$('#category').add(new Option('উৎসে অধ্যায় অনুল্লেখিত','0'));$('#quality').textContent='উৎসে অডিও লিংকসহ '+bn(tracks.length)+'টি এন্ট্রি পাওয়া গেছে। লেখা নির্বাচিত এন্ট্রির একই উৎস থেকে লোড হয়। সব রেকর্ডিং আলাদাভাবে শুনে বা প্রতিটি লিংক পরীক্ষা করে যাচাই করা হয়নি।';const hash=location.hash.replace('#audio-','');const id=hash||read('bookmark',read('last','1'));choose(tracks.find(t=>t.id===id)||tracks[0]);}).catch(()=>{$('#title').textContent='তালিকা লোড করা যায়নি';$('#listen').disabled=true;status('ইন্টারনেট সংযোগ পরীক্ষা করে পৃষ্ঠাটি আবার খুলুন।')});

const mobileSidebar=window.matchMedia('(max-width:800px)');
const selectorDialog=$('#selector-dialog'),selectorPanel=$('#hadith-sidebar');
const sidebarHome=document.createComment('desktop sidebar position');
selectorPanel.before(sidebarHome);
function reflectSidebar(){const open=selectorDialog.open;$('#sidebar-toggle').setAttribute('aria-expanded',String(open));document.body.classList.toggle('selector-open',open)}
function setMobileSidebar(open,restoreFocus=false){
 if(open&&mobileSidebar.matches){if(!selectorDialog.open)selectorDialog.showModal()}
 else if(selectorDialog.open)selectorDialog.close();
 reflectSidebar();if(restoreFocus&&mobileSidebar.matches)$('#sidebar-toggle').focus();
}
function closeMobileSidebar(){if(selectorDialog.open)setMobileSidebar(false,true)}
function placeSidebar(){setMobileSidebar(false);if(mobileSidebar.matches)selectorDialog.append(selectorPanel);else sidebarHome.after(selectorPanel)}
$('#sidebar-toggle').onclick=()=>setMobileSidebar(true);
$('#selector-close').onclick=()=>setMobileSidebar(false,true);
selectorDialog.addEventListener('click',e=>{if(e.target===selectorDialog)setMobileSidebar(false,true)});
selectorDialog.addEventListener('close',()=>{reflectSidebar();if(mobileSidebar.matches)$('#sidebar-toggle').focus()});
mobileSidebar.addEventListener('change',placeSidebar);
placeSidebar();

const playerSettings=$('#player-settings'),extraSettings=$('.recorded-player .settings'),soundSettings=$('.sound-settings');
const extraHome=document.createComment('playback settings position'),soundHome=document.createComment('sound settings position');
extraSettings.before(extraHome);soundSettings.before(soundHome);
function reflectPlayerSettings(){document.body.classList.toggle('player-settings-open',playerSettings.open)}
function placePlayerSettings(){if(playerSettings.open)playerSettings.close();if(mobileSidebar.matches){$('#player-settings-body').append(extraSettings,soundSettings)}else{extraHome.after(extraSettings);soundHome.after(soundSettings)}reflectPlayerSettings()}
$('#player-options').onclick=()=>{playerSettings.showModal();reflectPlayerSettings()};
$('#player-settings-close').onclick=()=>playerSettings.close();
playerSettings.addEventListener('close',()=>{reflectPlayerSettings();if(mobileSidebar.matches)$('#player-options').focus()});
playerSettings.addEventListener('click',e=>{if(e.target===playerSettings)playerSettings.close()});
$('#settings-stop').onclick=()=>{stop();playerSettings.close();status('পাঠ বন্ধ হয়েছে।')};
mobileSidebar.addEventListener('change',placePlayerSettings);placePlayerSettings();
