const intro=document.getElementById('entrance'),shell=document.querySelector('.shell');
if(intro&&shell&&document.documentElement.dataset.entrance==='skip'){intro.remove();}
else if(intro&&shell){
 let closed=false;document.documentElement.classList.add('intro-active');
 const leave=()=>{
  if(closed)return;closed=true;shell.inert=false;document.documentElement.classList.remove('intro-active');intro.classList.add('is-leaving');
  setTimeout(()=>{intro.remove();const target=document.querySelector('#content h1')||document.getElementById('content');target.setAttribute('tabindex','-1');target.focus({preventScroll:true});},matchMedia('(prefers-reduced-motion: reduce)').matches?0:450);
 };
 shell.inert=true;intro.setAttribute('tabindex','-1');intro.focus({preventScroll:true});
 intro.addEventListener('keydown',e=>{if(e.key==='Escape')leave();if(e.key==='Tab'){e.preventDefault();intro.focus();}});
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)leave();else setTimeout(leave,2600);
}
