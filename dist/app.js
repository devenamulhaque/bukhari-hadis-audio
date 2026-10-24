import {isKnownMaleBengaliVoice} from './voice-policy.mjs';
const $=s=>document.querySelector(s), bn=n=>Number(n).toLocaleString('bn-BD',{maximumFractionDigits:3});
const synth=window.speechSynthesis;
let data=[],filtered=[],categories={},selected=null,shown=60,token=0,mode='stopped',utterance;
const status=s=>$('#status').textContent=s;
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function read(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
function digits(s){return s.replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c))}
function voices(){
 if(!synth){status('এই ব্রাউজারে যন্ত্রের কণ্ঠে পাঠ সমর্থিত নয়।');$('#play').disabled=true;return}
 const old=$('#voice').value;
 $('#voice').replaceChildren();
 synth.getVoices().filter(isKnownMaleBengaliVoice).forEach(v=>{const o=new Option(v.name+' ('+v.lang+')',v.voiceURI);$('#voice').add(o)});
 if(!$('#voice').options.length){$('#voice').add(new Option('পুরুষ বাংলা কণ্ঠ পাওয়া যায়নি',''));$('#play').disabled=true;status('এই ডিভাইসে শনাক্ত করা পুরুষ বাংলা কণ্ঠ নেই। মূল অডিও লাইব্রেরিতে পুরুষ রেকর্ডিং শুনুন।')}
 else{$('#play').disabled=false;if([...$('#voice').options].some(o=>o.value===old))$('#voice').value=old;status('যন্ত্রের কণ্ঠে বাংলা পাঠ · শুনতে বোতাম চাপুন')}
}
function stop(){token++;synth?.cancel();mode='stopped';$('#play').textContent='▶ শুনুন'}
function select(h){stop();selected=h;save('last',h.hadithnumber);$('#chapter').textContent=categories[h.reference.book]||'সহিহ আল-বুখারী';$('#title').textContent='হাদিস '+bn(h.hadithnumber);$('#reference').textContent=(h.reference.book?'সহিহ আল-বুখারী · অধ্যায় '+bn(h.reference.book)+' · অধ্যায়ের হাদিস '+bn(h.reference.hadith):'সহিহ আল-বুখারী · উৎসে অধ্যায়ের রেফারেন্স অনুল্লেখিত');$('#text').textContent=h.text.trim()||'এই এন্ট্রির বাংলা পাঠ উৎসে পাওয়া যায়নি। অন্য হাদিস বেছে নিন।';$('#playing-title').textContent='হাদিস '+bn(h.hadithnumber);$('#source').href='https://github.com/fawazahmed0/hadith-api/blob/1/editions/ben-bukhari.json';bookmark();list();location.hash='hadith-'+h.hadithnumber;status('নির্বাচিত হাদিস শুনতে ▶ চাপুন।')}
function bookmark(){const n=read('bookmark',null);$('#bookmark').textContent=n===selected?.hadithnumber?'★ মনে রাখা আছে':'☆ মনে রাখুন'}
function list(){const box=$('#list');box.replaceChildren();for(const h of filtered.slice(0,shown)){const b=document.createElement('button');b.className='row'+(selected===h?' selected':'');b.setAttribute('aria-pressed',String(selected===h));const a=document.createElement('strong');a.textContent='হাদিস '+bn(h.hadithnumber)+(h.text.trim()?'':' · পাঠ অনুপস্থিত');const s=document.createElement('span');s.textContent=h.text.trim().slice(0,95)||'উৎসে বাংলা পাঠ নেই';b.append(a,s);b.onclick=()=>select(h);box.append(b)}if(!filtered.length)box.textContent='কোনো হাদিস পাওয়া যায়নি।';$('#count').textContent=bn(filtered.length);$('#more').hidden=shown>=filtered.length}
function filter(){stop();const q=digits($('#search').value.trim()).toLocaleLowerCase();const cat=$('#category').value;filtered=data.filter(h=>(!cat||String(h.reference.book)===cat)&&(!q||(/^\d+(\.\d+)?$/.test(q)?String(h.hadithnumber)===q:digits(h.text.toLocaleLowerCase()).includes(q))));shown=60;list();status('তালিকা আপডেট হয়েছে। হাদিস বেছে নিন।')}
function next(delta,playing=false){if(!selected)return;let i=filtered.indexOf(selected);if(i<0)i=delta>0?-1:filtered.length;let h;for(i+=delta;i>=0&&i<filtered.length;i+=delta){if(!playing||filtered[i].text.trim()){h=filtered[i];break}}if(!h){stop();status('এই তালিকার শেষ।');return}select(h);if(playing)speak()}
// Small utterances avoid browser limits on long Bengali passages.
function chunks(text){const result=[];let current='';for(const word of text.split(/\s+/)){if((current+' '+word).length>180&&current){result.push(current);current=''}current+=(current?' ':'')+word}if(current)result.push(current);return result}
function speak(){
 if(!selected?.text.trim()){status('এই এন্ট্রিতে শোনানোর মতো পাঠ নেই।');return}
 const voice=synth?.getVoices().find(v=>v.voiceURI===$('#voice').value);if(!voice){status('পুরুষ বাংলা কণ্ঠ পাওয়া যায়নি।');return}
 stop();const my=token;mode='playing';$('#play').textContent='Ⅱ বিরতি';const parts=chunks(selected.text);let i=0;
 function run(){if(my!==token)return;if(i>=parts.length){if($('#auto').checked)next(1,true);else{stop();status('পাঠ শেষ।')}return}
 utterance=new SpeechSynthesisUtterance(parts[i++]);utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=Number($('#rate').value);
 utterance.onend=()=>{if(my===token)run()};utterance.onerror=e=>{if(my===token){stop();status('পাঠ চালানো যায়নি ('+e.error+')। আবার শুনুন বোতাম চাপুন।')}};
 status('যন্ত্রের কণ্ঠে পাঠ চলছে · অংশ '+bn(i)+' / '+bn(parts.length));synth.speak(utterance)
 }run()
}
$('#play').onclick=()=>{if(mode==='playing'){synth.pause();mode='paused';$('#play').textContent='▶ চালিয়ে যান';status('পাঠ বিরতিতে আছে।')}else if(mode==='paused'){synth.resume();mode='playing';$('#play').textContent='Ⅱ বিরতি';status('পাঠ চলছে।')}else speak()};
$('#stop').onclick=()=>{stop();status('পাঠ বন্ধ হয়েছে।')};$('#prev').onclick=()=>next(-1);$('#next').onclick=()=>next(1);$('#category').onchange=filter;
let debounce;$('#search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(filter,180)};$('#more').onclick=()=>{shown+=60;list()};
$('#bookmark').onclick=()=>{if(!selected)return;save('bookmark',selected.hadithnumber);bookmark();status('হাদিস মনে রাখা হয়েছে; পরেরবার সাইট খুললে এখান থেকে শুরু হবে।')};
$('#rate').onchange=$('#voice').onchange=()=>{if(mode!=='stopped'){stop();status('সেটিং বদলেছে। নতুন করে শুনুন বোতাম চাপুন।')}};
window.addEventListener('pagehide',stop);
if(synth)synth.onvoiceschanged=voices;voices();
Promise.all([fetch('bukhari.json').then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('categories.json').then(r=>{if(!r.ok)throw Error();return r.json()})]).then(([raw,c])=>{
 data=raw.hadiths;categories=c;filtered=data;$('#total').textContent=bn(data.length);
 for(const [id,name]of Object.entries(c))$('#category').add(new Option(bn(id)+'. '+name,id));
 const missing=data.filter(h=>!h.text.trim()).length;$('#quality').textContent='এই ডেটাসেটে '+bn(data.length)+'টি এন্ট্রি আছে; '+bn(missing)+'টির পাঠ খালি। ৩১১টি এন্ট্রির অধ্যায় উৎসে অনুল্লেখিত; সেগুলো আলাদা বিভাগে আছে। ধারাবাহিক পাঠে খালি এন্ট্রি বাদ যাবে। সম্পূর্ণতা ও অনুবাদ স্বাধীনভাবে যাচাই করা হয়নি।';
 const hash=Number(location.hash.replace('#hadith-',''));const remembered=read('bookmark',read('last',1));select(data.find(h=>h.hadithnumber===(hash||remembered))||data[0]);voices();
}).catch(()=>{$('#title').textContent='পাঠ লোড করা যায়নি';$('#text').textContent='ইন্টারনেট সংযোগ পরীক্ষা করে পৃষ্ঠাটি আবার খুলুন।';status('ডেটা লোড করতে সমস্যা হয়েছে।');$('#play').disabled=true});
