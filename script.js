const TYPES=["SUV","Sedan","Truck","Economy","Minivan","Luxury"];
const CARS=[
{n:"Toyota RAV4",t:"SUV",s:5,b:3,r:89},{n:"Honda CR-V",t:"SUV",s:5,b:3,r:94},{n:"Ford Escape",t:"SUV",s:5,b:3,r:84},
{n:"Honda Civic",t:"Sedan",s:5,b:2,r:62},{n:"Toyota Camry",t:"Sedan",s:5,b:3,r:72},{n:"Nissan Altima",t:"Sedan",s:5,b:3,r:68},
{n:"Ford F-150",t:"Truck",s:5,b:3,r:105},{n:"Ram 1500",t:"Truck",s:5,b:3,r:110},{n:"Chevrolet Silverado",t:"Truck",s:5,b:3,r:108},
{n:"Toyota Corolla",t:"Economy",s:5,b:2,r:54},{n:"Hyundai Elantra",t:"Economy",s:5,b:2,r:52},{n:"Kia Rio",t:"Economy",s:5,b:2,r:49},
{n:"Chrysler Pacifica",t:"Minivan",s:7,b:4,r:119},{n:"Toyota Sienna",t:"Minivan",s:7,b:4,r:125},{n:"Dodge Grand Caravan",t:"Minivan",s:7,b:4,r:109},
{n:"BMW 3 Series",t:"Luxury",s:5,b:2,r:145},{n:"Mercedes C-Class",t:"Luxury",s:5,b:2,r:155},{n:"Audi A4",t:"Luxury",s:5,b:2,r:149}];
const LOCS=["Oshawa Centre","Whitby – Downtown","Pickering Town Centre","Scarborough Town Centre"];
const ADDONS=[{id:"gps",n:"GPS navigation",p:8},{id:"carplay",n:"Apple CarPlay",p:5},{id:"child",n:"Child seat",p:12},{id:"driver",n:"Extra driver",p:15}];
const ORDER=["type","car","pickup","dates","addons","driver","summary"];
const MISHEAR={ottawa:"Oshawa Centre"};
const S={step:"welcome",type:"",car:null,pickup:"",start:"",end:"",addons:[],name:"",email:"",ref:"",paused:false,rec:null,fix:false,last:""};
const $=id=>document.getElementById(id);
const chat=$("chat");
const esc=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"$"+n.toFixed(2);
const norm=s=>s.toLowerCase().replace(/[–—]/g," ").trim();

/* Avatar */
function mode(m,t){$("avatar").dataset.mode=m;$("label").textContent=t||"Your rental assistant"}
let VOICE=null;
function pickVoice(){
  const vs=speechSynthesis.getVoices().filter(v=>v.lang.startsWith("en"));
  const prefer=["Aria","Jenny","Zira","Samantha","Google UK English Female","Google US English","Hazel","Susan","Karen","Moira","Female"];
  for(const p of prefer){const v=vs.find(v=>v.name.includes(p));if(v){VOICE=v;return}}
  VOICE=vs[0]||null;
}
if("speechSynthesis" in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function speak(text){
  if(!("speechSynthesis" in window)||S.paused)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g," "));
  if(VOICE)u.voice=VOICE;
  u.pitch=1.1;
  u.onstart=()=>mode("talking","Ava is speaking…");
  u.onend=u.onerror=()=>mode("idle");
  speechSynthesis.speak(u);
}

/* Chat helpers */
function msg(html,who="ava"){
  const r=document.createElement("div");r.className="row "+who;
  const b=document.createElement("div");b.className="bubble";b.innerHTML=html;
  r.appendChild(b);chat.appendChild(r);chat.scrollTop=chat.scrollHeight;return b;
}
function say(text){S.last=text;msg(text);speak(text)}
function quick(items){
  const q=$("quick");q.innerHTML="";
  items.forEach(i=>{const b=document.createElement("button");b.className="qb"+(i.main?" main":"");b.textContent=i.l;b.onclick=i.a;q.appendChild(b)});
}
const choices=list=>quick(list.map(v=>({l:v,a:()=>process(v)})));

/* Money & dates */
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fmt=v=>v?new Date(v+"T12:00:00").toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"}):"";
function days(){return S.start&&S.end?Math.max(1,Math.round((new Date(S.end+"T12:00:00")-new Date(S.start+"T12:00:00"))/864e5)):1}
function total(){
  if(!S.car)return 0;
  const d=days(),extras=S.addons.reduce((a,id)=>a+ADDONS.find(x=>x.id===id).p*d,0),sub=S.car.r*d+extras+15;
  return sub*1.13;
}
function parseDate(s){
  const x=norm(s),now=new Date();
  let m=x.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
  if(x.includes("tomorrow"))return iso(new Date(now.getTime()+864e5));
  if(x.includes("today"))return iso(now);
  m=x.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})/);
  if(m){const mo="jan feb mar apr may jun jul aug sep oct nov dec".split(" ").indexOf(m[1]);let d=new Date(now.getFullYear(),mo,+m[2]);if(d<now)d.setFullYear(d.getFullYear()+1);return iso(d)}
  const wd=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].findIndex(v=>x.includes(v));
  if(wd>=0){let diff=(wd-now.getDay()+7)%7;if(diff===0)diff=7;return iso(new Date(now.getTime()+diff*864e5))}
  return "";
}

/* Status panel */
function done(k){return {type:!!S.type,car:!!S.car,pickup:!!S.pickup,dates:!!(S.start&&S.end),addons:S.step!=="type"&&ORDER.indexOf(S.step)>4||S.step==="done",driver:!!S.email}[k]}
function render(){
  const rows=[
    ["type","Vehicle type",S.type],
    ["car","Car",S.car?S.car.n+" · "+money(S.car.r)+"/day":""],
    ["pickup","Pickup location",S.pickup],
    ["dates","Dates",S.start&&S.end?fmt(S.start)+" → "+fmt(S.end)+" ("+days()+" day"+(days()>1?"s":"")+")":S.start?"From "+fmt(S.start):""],
    ["addons","Add-ons",done("addons")?(S.addons.length?S.addons.map(id=>ADDONS.find(a=>a.id===id).n).join(", "):"None"):""],
    ["driver","Driver",S.email?S.name+" · "+S.email:""]];
  let n=0;
  $("steps").innerHTML="";
  rows.forEach(([k,l,v])=>{
    const ok=k==="addons"?done("addons"):!!v&&done(k);if(ok)n++;
    const b=document.createElement("button");b.className="step"+(ok?" done":"");
    b.innerHTML=`<i>${ok?"✓":""}</i><span>${l}<small>${v?esc(v):"Not chosen yet"}</small></span>${ok?"<em>Edit</em>":""}`;
    if(ok)b.onclick=()=>edit(k);
    $("steps").appendChild(b);
  });
  $("prog").style.width=Math.round(n/6*100)+"%";
  $("progText").textContent=S.step==="done"?"Booking confirmed":n+" of 6 done";
  $("total").textContent=money(total());
  $("totalNote").textContent=S.car&&!(S.start&&S.end)?"Per 1 day until dates are set":"Incl. fees & tax";
}

/* Flow */
function nextAfter(k){
  if(S.fix&&S.email){S.fix=false;return ask("summary")}
  ask(ORDER[ORDER.indexOf(k)+1]);
}
function edit(k){S.fix=!!S.email;msg("Change: "+({type:"vehicle type",car:"car",pickup:"pickup location",dates:"dates",addons:"add-ons",driver:"driver"}[k]),"user");ask(k)}
function ask(step){
  S.step=step;quick([]);render();
  if(step==="type"){say("What type of vehicle would you like?");choices(TYPES)}
  else if(step==="car"){
    const list=CARS.filter(c=>c.t===S.type).slice(0,3);
    const b=msg("Here are the "+S.type+" options. Prices are per day.");
    S.last="Here are the "+S.type+" options. "+list.map(c=>c.n+", "+c.r+" dollars a day").join(". ");speak(S.last);
    const g=document.createElement("div");g.className="cars";
    list.forEach(c=>{const d=document.createElement("div");d.className="car";
      d.innerHTML=`<b>${c.n}</b><small>${c.s} seats · ${c.b} bags</small><strong>$${c.r}/day</strong>`;
      const bt=document.createElement("button");bt.className="qb main";bt.textContent="Select";
      bt.onclick=()=>pickCar(c);d.appendChild(bt);g.appendChild(d)});
    b.appendChild(g);chat.scrollTop=chat.scrollHeight;
  }
  else if(step==="pickup"){say("Where would you like to pick up your car?");choices(LOCS)}
  else if(step==="dates"){
    say("What date do you want the car from, and until? Pick the start and end dates, or just tell me.");
    const b=msg(""),w=document.createElement("div");w.className="dates";
    const t=iso(new Date());
    w.innerHTML=`<div><label>Start date</label><input type="date" id="d1" min="${t}" value="${S.start}"></div><div><label>End date</label><input type="date" id="d2" min="${t}" value="${S.end}"></div>`;
    const bt=document.createElement("button");bt.className="qb main";bt.textContent="Continue";
    bt.onclick=()=>{const a=$("d1").value,z=$("d2").value;
      if(!a||!z)return say("I need both a start and an end date.");
      if(z<a)return say("The end date must be after the start date.");
      setDates(a,z)};
    w.appendChild(bt);b.appendChild(w);
  }
  else if(step==="addons"){
    say("Would you like any extras? Switch on what you want. The total updates as you go.");
    const b=msg("");
    ADDONS.forEach(a=>{const o=document.createElement("div");o.className="opt";
      o.innerHTML=`<label><input type="checkbox" ${S.addons.includes(a.id)?"checked":""}> ${a.n}</label><span>+$${a.p}/day</span>`;
      o.querySelector("input").onchange=e=>{S.addons=e.target.checked?[...S.addons,a.id]:S.addons.filter(x=>x!==a.id);render()};
      b.appendChild(o)});
    quick([{l:"Continue →",main:true,a:()=>{msg(S.addons.length?"Add "+S.addons.map(id=>ADDONS.find(a=>a.id===id).n).join(", "):"No extras","user");nextAfter("addons")}}]);
  }
  else if(step==="driver"){say("Last details: please type the driver's name and email. Example: Alex Morgan, alex@example.com")}
  else if(step==="summary"){
    say("Here is your booking. Tap any chip to change it, or confirm.");
    const b=msg(""),c=document.createElement("div");c.className="chips";
    [["type",S.type],["car",S.car.n],["pickup",S.pickup],["dates",fmt(S.start)+" → "+fmt(S.end)],["addons",S.addons.length?S.addons.map(id=>ADDONS.find(a=>a.id===id).n).join(", "):"No extras"],["driver",S.name+" · "+S.email]].forEach(([k,v])=>{
      const x=document.createElement("button");x.className="chip";x.textContent=v;x.onclick=()=>edit(k);c.appendChild(x)});
    b.appendChild(c);
    const t=document.createElement("div");t.style.marginTop="10px";t.innerHTML="<b>Total: "+money(total())+" CAD</b> (incl. fees &amp; tax)";b.appendChild(t);
    quick([{l:"Confirm ✓",main:true,a:confirmBooking},{l:"Change something",a:()=>say("Tap any chip above, or tell me what to change, like “change the dates”.")}]);
  }
}
function pickCar(c){S.car=c;msg("I'll take the "+c.n,"user");nextAfter("car")}
function setDates(a,z){S.start=a;S.end=z;msg(fmt(a)+" to "+fmt(z),"user");nextAfter("dates")}
function confirmBooking(){
  S.step="done";S.ref="DE-"+Math.floor(100000+Math.random()*900000);quick([]);render();
  const text=`Your booking is confirmed! Your booking number is ${S.ref}. Total ${money(total())} CAD.`;
  S.last=text;speak(text);
  msg(`<b>Booking number: ${S.ref}</b><br>${esc(S.car.n)} · ${esc(S.pickup)}<br>${fmt(S.start)} → ${fmt(S.end)}<br>Driver: ${esc(S.name)}<br><b>Total: ${money(total())} CAD</b>`);
  quick([{l:"Start a new booking",main:true,a:reset}]);
}
function welcome(){
  S.step="welcome";quick([]);render();
  msg("Hi! I'm Ava. I'll help you book a rental car. You can <b>talk or type</b> your answers.");
  msg("<div class='note'><b>Privacy:</b> I only collect your trip details, name and email, so I can set up your booking. Nothing else is collected.</div>");
  speak("Hi! I'm Ava. I'll help you book a rental car. You can talk or type your answers.");
  quick([{l:"Start →",main:true,a:()=>{msg("Start","user");ask("type")}}]);
}
function reset(){
  Object.assign(S,{type:"",car:null,pickup:"",start:"",end:"",addons:[],name:"",email:"",ref:"",fix:false});
  chat.innerHTML="";window.speechSynthesis&&speechSynthesis.cancel();mode("idle");welcome();
}

/* Understanding the user */
function heard(raw){
  const key=Object.keys(MISHEAR).find(k=>norm(raw).includes(k));
  if(!key)return false;
  const g=MISHEAR[key];
  say("I heard: “"+esc(raw)+"”. Did you mean "+g+"?");
  quick([{l:"Yes, "+g,main:true,a:()=>process(g)},{l:"Retry mic",a:startMic},{l:"Type instead",a:()=>$("input").focus()}]);
  return true;
}
function process(text){
  const raw=text.trim();if(!raw)return;
  $("input").value="";msg(esc(raw),"user");quick([]);
  const x=norm(raw);
  if(S.step==="welcome"){return ask("type")}
  if(x==="restart"||x==="start over")return reset();
  if(x==="back")return goBack();
  if(S.step==="done")return say("Your booking is complete. Tap “Start a new booking” to book another.");
  if(/\b(change|edit|actually)\b/.test(x)&&S.email){
    const map=[["date","dates"],["car","car"],["vehicle","type"],["suv","type"],["sedan","type"],["truck","type"],["minivan","type"],["location","pickup"],["pickup","pickup"],["add","addons"],["gps","addons"],["name","driver"],["email","driver"]];
    const hit=map.find(m=>x.includes(m[0]));
    if(hit){
      const t=TYPES.find(v=>x.includes(v.toLowerCase()));
      if(t&&hit[1]==="type"){S.type=t;S.car=null;S.fix=true;return ask("car")}
      S.fix=true;return ask(hit[1]);
    }
  }
  const st=S.step;
  if(st==="type"){
    const t=TYPES.find(v=>x.includes(v.toLowerCase()))||(x.includes("pickup")?"Truck":x.includes("compact")?"Economy":"");
    if(!t){say("I can offer SUV, Sedan, Truck, Economy, Minivan or Luxury. Which would you like?");return choices(TYPES)}
    S.type=t;S.car=null;return nextAfter("type");
  }
  if(st==="car"){
    const c=CARS.find(c=>c.t===S.type&&x.includes(c.n.toLowerCase()));
    if(!c){say("Please choose one of the cars shown on screen.");return ask("car")}
    return pickCar(c);
  }
  if(st==="pickup"){
    const l=LOCS.find(v=>x.includes(norm(v).split(" ")[0]));
    if(!l){
      if(heard(raw))return;
      say("Sorry, I don't have that location. I can pick up at: "+LOCS.join(", ")+".");return choices(LOCS);
    }
    S.pickup=l;return nextAfter("pickup");
  }
  if(st==="dates"){
    const parts=raw.split(/\s+(?:to|until|till|through)\s+|\s+-\s+/i);
    const a=parseDate(parts[0]),z=parts[1]?parseDate(parts[1]):"";
    if(a&&z){if(z<a)return say("The end date must be after the start date.");return setDates(a,z)}
    if(S.start&&a&&parts.length===1){if(a<S.start)return say("The end date must be after the start date.");return setDates(S.start,a)}
    if(a){S.start=a;render();return say("Got it, starting "+fmt(a)+". What date do you want it until?")}
    return say("I didn't catch that date. Try “Friday to Sunday” or use the date pickers.");
  }
  if(st==="addons"){
    if(/none|no extras|no thanks|skip|continue/.test(x))S.addons=[];
    else{
      const f=ADDONS.filter(a=>x.includes(a.id)||x.includes(a.n.toLowerCase())||x.includes(a.n.split(" ")[0].toLowerCase()));
      if(!f.length){say("You can add GPS, Apple CarPlay, a child seat or an extra driver, or say none.");return ask("addons")}
      S.addons=[...new Set([...S.addons,...f.map(a=>a.id)])];
    }
    return nextAfter("addons");
  }
  if(st==="driver"){
    const e=raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if(!e)return say("I need a valid email address too. Example: Alex Morgan, alex@example.com");
    S.email=e[0];S.name=raw.replace(e[0],"").replace(/[,;]/g," ").trim()||"Driver";
    return nextAfter("driver");
  }
  if(st==="summary"){
    if(/^(yes|confirm|confirmed|book it|looks good)$/.test(x))return confirmBooking();
    return say("Say “yes” to confirm, or tap a chip to change something.");
  }
}
function goBack(){
  const i=ORDER.indexOf(S.step);
  if(S.step==="done")return;
  if(i<=0){return reset()}
  S.fix=false;msg("Back","user");ask(ORDER[i-1]);
}

/* Voice input */
function startMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){say("Voice input isn't available here. Please type your answer.");return}
  if(S.rec){S.rec.stop();return}
  speechSynthesis&&speechSynthesis.cancel();
  const r=new SR();S.rec=r;r.lang="en-CA";r.interimResults=true;
  $("mic").classList.add("on");mode("listening","Listening…");
  r.onresult=e=>{
    const t=Array.from(e.results).map(x=>x[0].transcript).join("");$("input").value=t;
    if(e.results[e.results.length-1].isFinal){end();process(t)}
  };
  r.onerror=()=>{end();say("I couldn't hear that clearly. Retry the mic or type instead.");quick([{l:"Retry mic",main:true,a:startMic},{l:"Type instead",a:()=>$("input").focus()}])};
  r.onend=end;
  function end(){$("mic").classList.remove("on");if($("avatar").dataset.mode==="listening")mode("idle");S.rec=null}
  r.start();
}

/* Buttons */
$("send").onclick=()=>process($("input").value);
$("input").addEventListener("keydown",e=>{if(e.key==="Enter")process($("input").value)});
$("mic").onclick=startMic;
$("restart").onclick=reset;
$("back").onclick=goBack;
$("repeat").onclick=()=>{if(S.last)speak(S.last)};
$("pause").onclick=()=>{S.paused=!S.paused;if(S.paused){speechSynthesis.cancel();mode("idle")}$("pause").textContent=S.paused?"Resume voice":"Pause voice"};
welcome();