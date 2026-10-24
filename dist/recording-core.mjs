export const digits=s=>s.replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c));
export function filterTracks(tracks,chapter,query){const q=digits(query.trim());return tracks.filter(t=>(!chapter||t.chapter===chapter)&&(!q||t.id===q));}
export function adjacent(tracks,current,delta){const i=tracks.findIndex(t=>t.id===current);if(i<0)return delta>0?tracks[0]:tracks.at(-1);return tracks[i+delta];}
export function trustedAudio(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='hadisbangla.com'&&u.pathname.startsWith('/audio/bukhari/')}catch{return false}}
