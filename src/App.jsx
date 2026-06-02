import { useState, useEffect, useRef } from "react";

const ROLES = [
  { id: "wolf", name: "Sói", emoji: "🐺", team: "evil", color: "#e74c3c", max: 99 },
  { id: "seer", name: "Tiên Tri", emoji: "🔮", team: "good", color: "#a87cdb", max: 1 },
  { id: "guard", name: "Bảo Vệ", emoji: "🛡️", team: "good", color: "#5dade2", max: 1 },
  { id: "witch", name: "Phù Thủy", emoji: "🧪", team: "good", color: "#58d68d", max: 1 },
  { id: "cupid", name: "Cupid", emoji: "💘", team: "good", color: "#ff6fa5", max: 1 },
  { id: "villager", name: "Dân", emoji: "👤", team: "good", color: "#aab7b8", max: 99 },
];
const R = (id) => ROLES.find((r) => r.id === id) || ROLES.find((r) => r.id === "villager");
const SUGGEST = { 6:{wolf:2,seer:1,guard:1,witch:1,villager:1}, 8:{wolf:2,seer:1,guard:1,witch:1,cupid:1,villager:2}, 10:{wolf:3,seer:1,guard:1,witch:1,cupid:1,villager:3}, 12:{wolf:4,seer:1,guard:1,witch:1,cupid:1,villager:4} };

const NIGHT_ORDER = [
  { id:"wolves", role:"wolf", name:"Sói", emoji:"🐺", inst:"Sói thức dậy — Đêm nay sói muốn cắn ai? — Sói đi ngủ." },
  { id:"guard", role:"guard", name:"Bảo Vệ", emoji:"🛡️", inst:"Bảo Vệ thức dậy — Đêm nay bảo vệ muốn bảo vệ ai? — Bảo Vệ đi ngủ." },
  { id:"seer", role:"seer", name:"Tiên Tri", emoji:"🔮", inst:"Tiên Tri thức dậy — Tiên Tri đoán ai là sói? — Tiên Tri đi ngủ." },
  { id:"witch", role:"witch", name:"Phù Thủy", emoji:"🧪", inst:"Phù Thủy thức dậy — Đêm nay người này sẽ chết — Phù Thủy có muốn cứu không? — Phù Thủy có muốn giết ai không? — Phù Thủy đi ngủ." },
];

// Cupid & cặp đôi — chỉ gọi đêm đầu tiên (chèn trước thứ tự đêm thường)
const CUPID_PHASE = { id:"cupid", role:"cupid", name:"Cupid", emoji:"💘", inst:"Cupid thức dậy — Cupid muốn se duyên ai? — Cupid đi ngủ." };
const LOVERS_PHASE = { id:"lovers", role:null, name:"Cặp đôi", emoji:"💕", inst:"Cặp đôi thức dậy, nhìn nhau để nhận diện — Cặp đôi đi ngủ." };

export default function App() {
  const [screen, setScreen] = useState("setup_count");
  const [playerCount, setPlayerCount] = useState(8);
  const [nameInputs, setNameInputs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [assignIdx, setAssignIdx] = useState(null);
  const [savedGroups, setSavedGroups] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveUI, setShowSaveUI] = useState(false);
  const [showLoadUI, setShowLoadUI] = useState(false);
  const [round, setRound] = useState(1);
  const [nightIdx, setNightIdx] = useState(0);
  const [gameLog, setGameLog] = useState([]);
  const [wolfTarget, setWolfTarget] = useState(null);
  const [guardTarget, setGuardTarget] = useState(null);
  const [lastGuardTarget, setLastGuardTarget] = useState(null);
  const [seerTarget, setSeerTarget] = useState(null);
  const [seerRevealed, setSeerRevealed] = useState(false);
  const [witchHealLeft, setWitchHealLeft] = useState(true);
  const [witchKillLeft, setWitchKillLeft] = useState(true);
  const [witchAction, setWitchAction] = useState(null);
  const [witchKillTarget, setWitchKillTarget] = useState(null);
  const [timer, setTimer] = useState(120);
  const [timerOn, setTimerOn] = useState(false);
  const [timerVis, setTimerVis] = useState(false);
  const timerRef = useRef(null);
  const [voteTarget, setVoteTarget] = useState(null);
  const [nightDeaths, setNightDeaths] = useState([]);
  const [nightSaves, setNightSaves] = useState([]);
  const [winner, setWinner] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [lastNames, setLastNames] = useState(null); // auto-saved names
  const [lovers, setLovers] = useState(null);        // [idA, idB] | null — cặp tình nhân
  const [cupidDone, setCupidDone] = useState(false); // Cupid đã se duyên xong chưa
  const [cupidPick, setCupidPick] = useState([]);    // lựa chọn tạm khi Cupid chọn (tối đa 2)

  // ═══════ STORAGE ═══════
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("werewolf-groups"); if (r?.value) setSavedGroups(JSON.parse(r.value)); } catch(e){}
      try { const r2 = await window.storage.get("werewolf-last-names"); if (r2?.value) setLastNames(JSON.parse(r2.value)); } catch(e){}
    })();
  }, []);
  const saveGroup = async (name, names) => {
    const u = [...savedGroups.filter(g=>g.name!==name), {name, names, date: new Date().toLocaleDateString("vi-VN")}];
    setSavedGroups(u);
    try { await window.storage.set("werewolf-groups", JSON.stringify(u)); } catch(e){}
  };
  const deleteGroup = async (name) => {
    const u = savedGroups.filter(g=>g.name!==name); setSavedGroups(u);
    try { await window.storage.set("werewolf-groups", JSON.stringify(u)); } catch(e){}
  };
  const autoSaveNames = async (names) => {
    setLastNames(names);
    try { await window.storage.set("werewolf-last-names", JSON.stringify(names)); } catch(e){}
  };

  // ═══════ HELPERS ═══════
  const aliveP = (ps) => (ps||players).filter(p=>p.alive);
  const aliveW = (ps) => aliveP(ps).filter(p=>p.role==="wolf");
  const aliveG = (ps) => aliveP(ps).filter(p=>p.role!=="wolf");
  const hasRole = (rid) => players.some(p=>p.role===rid);
  const roleAlive = (rid) => players.some(p=>p.role===rid&&p.alive);
  const addLog = (e) => setGameLog(g=>[...g, e]);
  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const checkWin = (ps) => { if(aliveW(ps).length===0) return "village"; if(aliveW(ps).length>=aliveG(ps).length) return "wolf"; return null; };
  const killP = (pid,cause,rd,ps) => { const n=[...ps]; n[pid]={...n[pid], alive:false, deathRound:rd, deathCause:cause}; return n; };
  const getNightPhases = () => {
    const base = NIGHT_ORDER.filter(ph=>ph.id==="wolves"||hasRole(ph.role));
    if(!hasRole("cupid")) return base;
    return round===1 ? [CUPID_PHASE, LOVERS_PHASE, ...base] : base;
  };
  const isRoleDead = (phase) => phase.id!=="wolves" && !roleAlive(phase.role);
  // Cupid "gọi giả" từ đêm 2 hoặc sau khi đã se duyên; Tình nhân không bao giờ "chết"
  const phaseDead = (phase) => {
    if(!phase) return false;
    if(phase.id==="cupid") return round>1 || cupidDone;
    if(phase.id==="lovers") return false;
    return isRoleDead(phase);
  };
  // Chết dây chuyền: một tình nhân chết → người kia chết theo. Trả về np mới + danh sách chết thêm.
  const cascadeLovers = (np, rd) => {
    if(!lovers) return { np, extra:[] };
    const [a,b]=lovers;
    if(!np[a].alive && np[b].alive) { np=killP(b,"💔 Chết theo tình nhân",rd,np); return { np, extra:[{id:b,cause:"💔 Chết theo tình nhân"}] }; }
    if(!np[b].alive && np[a].alive) { np=killP(a,"💔 Chết theo tình nhân",rd,np); return { np, extra:[{id:a,cause:"💔 Chết theo tình nhân"}] }; }
    return { np, extra:[] };
  };
  const confirmCupid = () => {
    if(cupidPick.length!==2) return;
    setLovers([...cupidPick]); setCupidDone(true);
    addLog({type:"night",round:1,text:`💘 Cupid se duyên: ${players[cupidPick[0]].name} ❤️ ${players[cupidPick[1]].name}`});
    if(nightIdx < phases.length-1) setNightIdx(nightIdx+1); else resolveNight();
  };
  const getSuggestion = () => {
    const keys = Object.keys(SUGGEST).map(Number).sort((a,b)=>a-b);
    const cl = keys.reduce((p,c)=>Math.abs(c-playerCount)<Math.abs(p-playerCount)?c:p);
    const base = {...SUGGEST[cl]};
    const tot = Object.values(base).reduce((a,b)=>a+b,0);
    if(tot<playerCount) base.villager += playerCount-tot;
    if(tot>playerCount) base.villager = Math.max(0, base.villager-(tot-playerCount));
    return base;
  };

  // ═══════ TIMER ═══════
  useEffect(() => {
    if(timerOn&&timer>0) timerRef.current = setTimeout(()=>setTimer(t=>t-1),1000);
    else if(timer===0) setTimerOn(false);
    return ()=>clearTimeout(timerRef.current);
  }, [timerOn, timer]);

  // ═══════ SETUP ═══════
  const goNames = () => {
    // Auto-load last names if available
    if(lastNames && lastNames.length > 0) {
      const n = lastNames.slice(0, playerCount);
      while(n.length < playerCount) n.push("");
      setNameInputs(n);
    } else {
      setNameInputs(Array.from({length:playerCount},()=>""));
    }
    setScreen("setup_names");
  };
  const loadGroup = (g) => { const n=g.names.slice(0,playerCount); while(n.length<playerCount) n.push(""); setNameInputs(n); setShowLoadUI(false); };
  const goRoles = () => {
    autoSaveNames(nameInputs); // auto-save
    setPlayers(nameInputs.map((n,i)=>({id:i, name:n.trim()||`P${i+1}`, role:null, alive:true, deathRound:null, deathCause:null})));
    setScreen("setup_roles");
  };
  const assignRole = (pi,rid) => { setPlayers(p=>{const n=[...p]; n[pi]={...n[pi],role:rid}; return n;}); setAssignIdx(null); };
  const roleCount = (rid) => players.filter(p=>p.role===rid).length;
  const allAssigned = players.length>0 && players.every(p=>p.role);
  const valid = allAssigned && roleCount("wolf")>=1;
  const applySugg = () => { const sg=getSuggestion(); const np=[...players]; let idx=0; for(const[rid,c] of Object.entries(sg)){for(let i=0;i<c&&idx<np.length;i++,idx++) np[idx]={...np[idx],role:rid};} setPlayers(np); };

  const startGame = () => {
    setNightIdx(0); setRound(1); setGameLog([]); setWolfTarget(null); setGuardTarget(null); setLastGuardTarget(null);
    setSeerTarget(null); setSeerRevealed(false); setWitchHealLeft(true); setWitchKillLeft(true); setWitchAction(null);
    setWitchKillTarget(null); setWinner(null); setNightDeaths([]); setNightSaves([]);
    setLovers(null); setCupidDone(false); setCupidPick([]);
    setGameLog([{type:"system",round:1,text:"🌙 Trời tối, cả làng đi ngủ."}]);
    setScreen("night");
  };

  // ═══════ NIGHT ═══════
  const phases = getNightPhases();
  const curPhase = phases[nightIdx];

  const nextNight = () => {
    const ph = curPhase; const dead = phaseDead(ph);
    if(!dead && ph) {
      if(ph.id==="wolves"&&wolfTarget!==null) addLog({type:"night",round,text:`🐺 Sói cắn: ${players[wolfTarget].name}`});
      if(ph.id==="guard") addLog({type:"night",round,text:guardTarget!==null?`🛡️ Bảo Vệ: ${players[guardTarget].name}`:`🛡️ Bảo Vệ không bảo vệ ai`});
      if(ph.id==="seer"&&seerTarget!==null) addLog({type:"night",round,text:`🔮 Tiên Tri soi: ${players[seerTarget].name} → ${players[seerTarget].role==="wolf"?"SÓI":"DÂN"}`});
      if(ph.id==="witch") {
        if(witchAction==="heal") addLog({type:"night",round,text:`🧪 Phù Thủy dùng bình cứu`});
        else if(witchAction==="kill"&&witchKillTarget!==null) addLog({type:"night",round,text:`🧪 Phù Thủy giết: ${players[witchKillTarget].name}`});
        else addLog({type:"night",round,text:`🧪 Phù Thủy không dùng bình`});
      }
    }
    if(nightIdx < phases.length-1) setNightIdx(nightIdx+1);
    else resolveNight();
  };

  const resolveNight = () => {
    let np=[...players]; const deaths=[]; const saves=[];
    if(wolfTarget!==null&&np[wolfTarget].alive) {
      let saved=false;
      if(guardTarget===wolfTarget){saved=true; saves.push({id:wolfTarget,by:"Bảo Vệ"});}
      if(witchAction==="heal"){saved=true; saves.push({id:wolfTarget,by:"Phù Thủy (cứu)"});}
      if(!saved) deaths.push({id:wolfTarget,cause:"Bị sói cắn"});
    }
    if(witchAction==="kill"&&witchKillTarget!==null&&np[witchKillTarget].alive) {
      if(guardTarget===witchKillTarget) saves.push({id:witchKillTarget,by:"Bảo Vệ (chặn bình độc)"});
      else if(!deaths.find(d=>d.id===witchKillTarget)) deaths.push({id:witchKillTarget,cause:"Bị Phù Thủy giết"});
    }
    deaths.forEach(d=>{np=killP(d.id,d.cause,round,np);});
    const casc=cascadeLovers(np,round); np=casc.np; casc.extra.forEach(d=>deaths.push(d));
    saves.forEach(sv=>addLog({type:"night",round,text:`✨ ${np[sv.id].name} được ${sv.by} cứu`}));
    if(witchAction==="heal") setWitchHealLeft(false);
    if(witchAction==="kill") setWitchKillLeft(false);
    setLastGuardTarget(guardTarget);
    if(deaths.length===0) addLog({type:"result",round,text:"Đêm bình yên — không ai chết"});
    deaths.forEach(d=>addLog({type:"result",round,text:`💀 ${np[d.id].name} (${R(np[d.id].role).name}) chết — ${d.cause}`}));
    setPlayers(np); setNightDeaths(deaths); setNightSaves(saves);
    addLog({type:"system",round,text:"☀️ Trời sáng, cả làng thức dậy."});
    const w=checkWin(np);
    if(w){setWinner(w); addLog({type:"system",round,text:w==="wolf"?"🐺 Phe Sói thắng!":"🏘️ Phe Dân thắng!"}); setScreen("end"); return;}
    setScreen("day_announce");
  };

  const goDiscuss = () => { setTimer(120); setTimerOn(false); setTimerVis(false); setScreen("day"); };
  const goVote = () => { setTimerOn(false); setTimerVis(false); setVoteTarget(null); setScreen("vote"); };
  const confirmVote = () => {
    let np=[...players];
    if(voteTarget!==null) {
      addLog({type:"day",round,text:`🗳️ ${np[voteTarget].name} bị treo cổ`});
      np=killP(voteTarget,"Bị treo cổ",round,np);
      const casc=cascadeLovers(np,round); np=casc.np;
      casc.extra.forEach(d=>addLog({type:"day",round,text:`💔 ${np[d.id].name} chết theo tình nhân`}));
      setPlayers(np);
      const w=checkWin(np);
      if(w){setWinner(w); addLog({type:"system",round,text:w==="wolf"?"🐺 Phe Sói thắng!":"🏘️ Phe Dân thắng!"}); setScreen("end"); return;}
    } else addLog({type:"day",round,text:"🕊️ Không ai bị treo cổ"});
    goNextNight();
  };
  const goNextNight = () => {
    setRound(r=>r+1); setNightIdx(0); setWolfTarget(null); setGuardTarget(null);
    setSeerTarget(null); setSeerRevealed(false); setWitchAction(null); setWitchKillTarget(null);
    setNightDeaths([]); setNightSaves([]); setCupidPick([]); setScreen("night");
  };

  const tryEndGame = () => setShowEndConfirm(true);
  const confirmEnd = () => {
    setShowEndConfirm(false);
    if(!winner){const w=checkWin(players); if(w){setWinner(w); addLog({type:"system",round,text:w==="wolf"?"🐺 Phe Sói thắng!":"🏘️ Phe Dân thắng!"});}}
    setScreen("end");
  };

  // New game — keep names
  const newGame = () => {
    const names = players.map(p=>p.name);
    autoSaveNames(names);
    setNameInputs(names);
    setPlayerCount(names.length);
    setPlayers(names.map((n,i)=>({id:i,name:n,role:null,alive:true,deathRound:null,deathCause:null})));
    setGameLog([]); setWinner(null); setRound(1);
    setLovers(null); setCupidDone(false); setCupidPick([]);
    setScreen("setup_roles"); // go straight to roles since names are kept
  };

  const fullReset = () => {
    setScreen("setup_count"); setPlayers([]); setGameLog([]); setWinner(null);
  };

  // ═══════ COMPONENTS ═══════
  const Board = ({selectable,onSelect,selectedId,selectedIds,disabledIds,mode,wolfPhase}) => {
    const disSet = new Set(disabledIds||[]);
    const selSet = new Set(selectedIds||[]);
    return (
      <div style={st.board}>
        <div style={st.bHead}>
          <span style={st.bTitle}>📋 Bảng người chơi</span>
          <span style={st.bStat}>🧑{aliveP().length} 💀{players.filter(p=>!p.alive).length} 🐺{aliveW().length}</span>
        </div>
        <div style={st.grid}>
          {players.map(p=>{
            const role=R(p.role); const sel=selectedId===p.id||selSet.has(p.id); const dis=disSet.has(p.id);
            const isLover = lovers && lovers.includes(p.id);
            // Wolves can't bite wolves
            const isWolfTarget = wolfPhase && p.role==="wolf";
            const canTap = selectable && p.alive && !dis && !isWolfTarget;
            const deadSpecial = !p.alive && ["seer","guard","witch"].includes(p.role);
            let bc="rgba(255,255,255,0.06)",bg="rgba(255,255,255,0.02)";
            if(sel){bc=mode==="kill"?"#e74c3c":mode==="seer"?"#a87cdb":mode==="guard"?"#5dade2":mode==="cupid"?"#ff6fa5":"#f1c40f"; bg=bc+"18";}
            else if(p.alive&&isWolfTarget){bc="rgba(231,76,60,0.15)";bg="rgba(231,76,60,0.04)";}
            else if(p.alive) bc="rgba(46,204,113,0.2)";
            else if(deadSpecial){bc="rgba(255,200,100,0.2)";bg="rgba(255,200,100,0.04)";}
            else{bc="rgba(231,76,60,0.15)";bg="rgba(0,0,0,0.12)";}
            return (
              <div key={p.id} onClick={()=>canTap&&onSelect?.(p.id)}
                style={{...st.cell, opacity:p.alive?(dis||isWolfTarget?0.4:1):(deadSpecial?0.55:0.25), borderColor:bc, background:bg, cursor:canTap?"pointer":"default"}}>
                {dis && <div style={st.disBadge}>🚫</div>}
                {p.alive&&isWolfTarget && <div style={{...st.disBadge,fontSize:9,background:"rgba(231,76,60,0.7)"}}>🐺</div>}
                <div style={st.cellR1}>
                  <span style={{fontSize:13,fontWeight:700,textDecoration:p.alive?"none":"line-through",color:p.alive?"#fff":"rgba(255,255,255,0.45)"}}>{p.name}{isLover && <span style={{fontSize:11,marginLeft:3}} title="Tình nhân">💕</span>}</span>
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    {sel && <span style={{fontSize:11}}>{mode==="kill"?"🎯":mode==="seer"?"👁️":mode==="guard"?"🛡️":mode==="cupid"?"💘":"🎯"}</span>}
                    {!p.alive && <span style={{fontSize:10}}>💀</span>}
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <span style={{fontSize:12}}>{role.emoji}</span>
                    <span style={{fontSize:10,fontWeight:600,color:role.color}}>{role.name}</span>
                  </div>
                  {!p.alive && <span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>Đ{p.deathRound}</span>}
                </div>
                {!p.alive&&p.deathCause && <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",marginTop:1}}>{p.deathCause}</div>}
                {deadSpecial && <div style={{fontSize:8,color:"rgba(255,200,100,0.5)",marginTop:1}}>⚠ Vẫn gọi giả</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const LogDrawer = () => (
    <div style={st.logOv} onClick={()=>setShowLog(false)}>
      <div style={st.logPan} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:700}}>📜 Lịch sử</span>
          <button style={st.closeBtn} onClick={()=>setShowLog(false)}>✕</button>
        </div>
        {gameLog.length===0 ? <p style={st.hint}>Chưa có</p> : gameLog.map((g,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11}}>
            <span style={{...st.logB, background:g.type==="result"?"rgba(231,76,60,0.2)":g.type==="night"?"rgba(102,126,234,0.2)":g.type==="day"?"rgba(241,196,15,0.2)":"rgba(255,255,255,0.08)", color:g.type==="result"?"#e07070":g.type==="night"?"#8b9cf7":g.type==="day"?"#f0d060":"#999"}}>V{g.round}</span>
            <span style={{color:"rgba(255,255,255,0.55)",lineHeight:1.4}}>{g.text}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const SeerPopup = () => {
    if(!seerRevealed||seerTarget===null) return null;
    const p=players[seerTarget]; const isW=p.role==="wolf";
    return (<div style={st.ov}>
      <div style={{...st.pop,borderColor:isW?"rgba(231,76,60,0.5)":"rgba(46,204,113,0.5)",background:isW?"rgba(30,5,5,0.95)":"rgba(5,30,10,0.95)"}}>
        <span style={{fontSize:40}}>{isW?"🐺":"👤"}</span>
        <p style={{fontSize:15,fontWeight:700,margin:"4px 0 2px"}}>{p.name}</p>
        <p style={{fontSize:20,fontWeight:800,color:isW?"#e74c3c":"#2ecc71",margin:0}}>{isW?"LÀ SÓI!":"LÀ DÂN"}</p>
        <button style={st.popBtn} onClick={()=>setSeerRevealed(false)}>Đã hiểu ✓</button>
      </div>
    </div>);
  };

  const EndConfirm = () => (
    <div style={st.ov}>
      <div style={{...st.pop,borderColor:"rgba(255,255,255,0.15)",background:"rgba(20,15,30,0.97)"}}>
        <span style={{fontSize:36}}>⚠️</span>
        <p style={{fontSize:16,fontWeight:700,margin:"8px 0 4px"}}>Kết thúc ván?</p>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",margin:"0 0 14px",lineHeight:1.4}}>Ván chơi hiện tại sẽ kết thúc và chuyển sang màn hình tổng kết.</p>
        <div style={{display:"flex",gap:8,width:"100%"}}>
          <button style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.6)",fontSize:13,fontWeight:600,cursor:"pointer"}} onClick={()=>setShowEndConfirm(false)}>Hủy</button>
          <button style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#e74c3c,#c0392b)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}} onClick={confirmEnd}>Kết thúc</button>
        </div>
      </div>
    </div>
  );

  // ═══════════════ RENDER ═══════════════

  if(screen==="setup_count") {
    const sg=getSuggestion();
    return (<div style={st.page}><div style={st.glow}/><div style={st.w}>
      <div style={{textAlign:"center",padding:"16px 0 4px"}}>
        <span style={{fontSize:48,display:"block",filter:"drop-shadow(0 0 14px rgba(231,76,60,0.3))"}}>🐺</span>
        <h1 style={st.h1}>MA SÓI</h1><p style={st.sub}>Quản Trò</p>
      </div>
      <div style={st.card}>
        <label style={st.label}>Số người chơi</label>
        <div style={st.cen}>
          <button style={st.cBtn} onClick={()=>setPlayerCount(Math.max(4,playerCount-1))}>−</button>
          <span style={{fontSize:38,fontWeight:700,minWidth:48,textAlign:"center"}}>{playerCount}</span>
          <button style={st.cBtn} onClick={()=>setPlayerCount(Math.min(20,playerCount+1))}>+</button>
        </div>
        <div style={{textAlign:"center",marginTop:6}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Đề xuất: </span>
          {Object.entries(sg).map(([rid,c])=>c>0&&<span key={rid} style={{fontSize:10,color:R(rid).color}}>{R(rid).emoji}{c} </span>)}
        </div>
      </div>
      <button style={st.pri} onClick={goNames}>Tiếp → Nhập tên</button>
    </div></div>);
  }

  if(screen==="setup_names") return (<div style={st.page}><div style={st.w}>
    <div style={{textAlign:"center"}}><span style={{fontSize:28}}>✏️</span><h2 style={st.h2}>Nhập tên người chơi</h2>
      {lastNames && <p style={{fontSize:10,color:"rgba(46,204,113,0.6)",margin:"2px 0 0"}}>✓ Đã tự động điền tên từ ván trước</p>}
    </div>
    <div style={{display:"flex",gap:6}}>
      {savedGroups.length>0 && <button style={st.slBtn} onClick={()=>{setShowLoadUI(!showLoadUI);setShowSaveUI(false);}}>📂 Load nhóm</button>}
      <button style={st.slBtn} onClick={()=>{setShowSaveUI(!showSaveUI);setShowLoadUI(false);}}>💾 Lưu nhóm</button>
    </div>
    {showLoadUI && <div style={st.card}>{savedGroups.map(g=>(
      <div key={g.name} style={st.gRow}>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>loadGroup(g)}>
          <div style={{fontSize:13,fontWeight:600}}>{g.name}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{g.names.length} người · {g.date}</div>
        </div>
        <button style={st.delBtn} onClick={()=>deleteGroup(g.name)}>✕</button>
      </div>
    ))}</div>}
    {showSaveUI && <div style={{...st.card,display:"flex",gap:6}}>
      <input style={{...st.inp,flex:1}} value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Tên nhóm" maxLength={30}/>
      <button style={{...st.pri,width:"auto",padding:"8px 14px",fontSize:12}} onClick={()=>{if(saveName.trim()){saveGroup(saveName.trim(),nameInputs);setSaveName("");setShowSaveUI(false);}}}>Lưu</button>
    </div>}
    <div style={st.card}>
      {nameInputs.map((n,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={st.idx}>{i+1}</span>
          <input style={st.inp} value={n} onChange={e=>{const a=[...nameInputs];a[i]=e.target.value;setNameInputs(a);}} placeholder={`Người chơi ${i+1}`} maxLength={16}/>
        </div>
      ))}
    </div>
    <div style={st.r2}><button style={st.ghost} onClick={()=>setScreen("setup_count")}>← Quay lại</button><button style={st.pri} onClick={goRoles}>Tiếp → Chia vai</button></div>
  </div></div>);

  if(screen==="setup_roles") return (<div style={st.page}><div style={st.w}>
    <div style={{textAlign:"center"}}><span style={{fontSize:28}}>🎭</span><h2 style={st.h2}>Chia vai trò</h2></div>
    <button style={st.sugBtn} onClick={applySugg}>✨ Áp dụng đề xuất</button>
    <div style={st.card}>
      {players.map((p,i)=>(
        <div key={p.id}>
          <div style={{...st.aRow,borderColor:p.role?R(p.role).color+"35":"rgba(255,255,255,0.06)",background:assignIdx===i?"rgba(255,255,255,0.05)":"transparent"}} onClick={()=>setAssignIdx(assignIdx===i?null:i)}>
            <span style={{fontSize:13,fontWeight:600}}>{p.name}</span>
            {p.role ? <span style={{padding:"2px 7px",borderRadius:6,fontSize:11,fontWeight:600,background:R(p.role).color+"1a",color:R(p.role).color}}>{R(p.role).emoji} {R(p.role).name}</span>
              : <span style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>Chọn ▾</span>}
          </div>
          {assignIdx===i && <div style={st.picker}>{ROLES.map(r=>{
            const full=roleCount(r.id)>=r.max&&p.role!==r.id;
            return (<button key={r.id} onClick={()=>!full&&assignRole(i,r.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",borderRadius:7,border:`1px solid ${full?"rgba(255,255,255,0.05)":r.color+"40"}`,background:full?"rgba(255,255,255,0.01)":r.color+"10",cursor:full?"not-allowed":"pointer",color:"#fff",fontSize:11,opacity:full?0.3:1}}>
              <span>{r.emoji}</span><span style={{color:r.color,fontWeight:600}}>{r.name}</span>{full&&<span style={{fontSize:8,color:"rgba(255,255,255,0.25)"}}>(đủ)</span>}
            </button>);
          })}</div>}
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
        <span style={{color:valid?"#2ecc71":"#f39c12"}}>{players.filter(p=>p.role).length}/{players.length} gán</span>
        <span style={{color:"rgba(255,255,255,0.25)"}}>🐺{roleCount("wolf")} 🔮{roleCount("seer")} 🛡️{roleCount("guard")} 🧪{roleCount("witch")} 👤{roleCount("villager")}</span>
      </div>
    </div>
    <div style={st.r2}>
      <button style={st.ghost} onClick={()=>setScreen("setup_names")}>← Quay lại</button>
      <button style={{...st.pri,opacity:valid?1:0.35,pointerEvents:valid?"auto":"none"}} onClick={startGame}>🌙 Bắt đầu!</button>
    </div>
  </div></div>);

  // ═══════ NIGHT ═══════
  if(screen==="night") {
    if(!curPhase) return null;
    const dead = phaseDead(curPhase);
    const cupidActive = curPhase.id==="cupid" && !dead;
    const blockNext = cupidActive && !lovers; // phải xác nhận se duyên trước khi qua bước sau
    let bp={selectable:false}, actUI=null;

    if(curPhase.id==="wolves"&&!dead) {
      bp={selectable:true, onSelect:setWolfTarget, selectedId:wolfTarget, mode:"kill", wolfPhase:true};
      if(wolfTarget!==null) actUI=<div style={{...st.ab,borderColor:"rgba(231,76,60,0.25)",background:"rgba(231,76,60,0.08)"}}>🎯 Cắn: <strong>{players[wolfTarget].name}</strong></div>;
    }
    if(curPhase.id==="guard"&&!dead) {
      bp={selectable:true, onSelect:(pid)=>{if(pid!==lastGuardTarget)setGuardTarget(pid);}, selectedId:guardTarget, disabledIds:lastGuardTarget!==null?[lastGuardTarget]:[], mode:"guard"};
      actUI=(<div style={{display:"flex",flexDirection:"column",gap:5}}>
        {lastGuardTarget!==null && <div style={st.warn}>🚫 Không bảo vệ <strong>{players[lastGuardTarget].name}</strong> (đêm trước)</div>}
        {guardTarget!==null && <div style={{...st.ab,borderColor:"rgba(93,173,226,0.25)",background:"rgba(93,173,226,0.08)"}}>🛡️ Bảo vệ: <strong>{players[guardTarget].name}</strong></div>}
        <button style={st.skipB} onClick={()=>setGuardTarget(null)}>Không bảo vệ ai</button>
      </div>);
    }
    if(curPhase.id==="seer"&&!dead) {
      bp={selectable:true, selectedId:seerTarget, mode:"seer", onSelect:(pid)=>{setSeerTarget(pid);setSeerRevealed(true);}};
      if(seerTarget!==null) actUI=(<div style={{...st.ab,borderColor:"rgba(168,124,219,0.25)",background:"rgba(168,124,219,0.08)"}}>
        👁️ Đã soi: <strong>{players[seerTarget].name}</strong>
        <button style={st.miniBtn} onClick={()=>setSeerRevealed(true)}>Xem lại</button>
      </div>);
    }
    if(curPhase.id==="witch"&&!dead) {
      const bn=wolfTarget!==null?players[wolfTarget].name:null;
      bp={selectable:witchAction==="kill", selectedId:witchKillTarget, mode:"kill", onSelect:setWitchKillTarget};
      actUI=(<div style={st.witchP}>
        <div style={st.witchInfo}>{bn?<>🐺 Đêm nay <strong>{bn}</strong> sẽ chết</>:"🐺 Đêm nay sói không cắn ai"}</div>
        <div style={{display:"flex",gap:6}}>
          <button disabled={!witchHealLeft||!bn||witchAction==="kill"} onClick={()=>setWitchAction(witchAction==="heal"?null:"heal")}
            style={{...st.potBtn,borderColor:"rgba(46,204,113,0.3)",background:witchAction==="heal"?"rgba(46,204,113,0.22)":"rgba(46,204,113,0.06)",opacity:witchHealLeft&&bn&&witchAction!=="kill"?1:0.28}}>
            <span style={{fontSize:16}}>💚</span>
            <span style={{fontSize:10,fontWeight:600,color:"#2ecc71"}}>{witchAction==="heal"?"✓ Cứu":"Bình cứu"}</span>
            {!witchHealLeft && <span style={st.used}>Đã dùng</span>}
          </button>
          <button disabled={!witchKillLeft||witchAction==="heal"} onClick={()=>{setWitchAction(witchAction==="kill"?null:"kill");setWitchKillTarget(null);}}
            style={{...st.potBtn,borderColor:"rgba(231,76,60,0.3)",background:witchAction==="kill"?"rgba(231,76,60,0.22)":"rgba(231,76,60,0.06)",opacity:witchKillLeft&&witchAction!=="heal"?1:0.28}}>
            <span style={{fontSize:16}}>☠️</span>
            <span style={{fontSize:10,fontWeight:600,color:"#e74c3c"}}>{witchAction==="kill"?"Chọn ↓":"Bình độc"}</span>
            {!witchKillLeft && <span style={st.used}>Đã dùng</span>}
          </button>
        </div>
        {witchAction==="heal" && <div style={{...st.ab,borderColor:"rgba(46,204,113,0.25)",background:"rgba(46,204,113,0.08)"}}>💚 Cứu: <strong>{bn}</strong></div>}
        {witchAction==="kill"&&witchKillTarget!==null && <div style={{...st.ab,borderColor:"rgba(231,76,60,0.25)",background:"rgba(231,76,60,0.08)"}}>☠️ Giết: <strong>{players[witchKillTarget].name}</strong></div>}
        <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textAlign:"center"}}>⚠ Mỗi đêm chỉ dùng tối đa 1 bình</div>
      </div>);
    }
    if(curPhase.id==="cupid"&&!dead) {
      bp={selectable:true, selectedIds:cupidPick, mode:"cupid", onSelect:(pid)=>setCupidPick(cur=>cur.includes(pid)?cur.filter(x=>x!==pid):cur.length<2?[...cur,pid]:cur)};
      actUI=(<div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{...st.ab,borderColor:"rgba(255,111,165,0.25)",background:"rgba(255,111,165,0.08)",color:"#ff9ec2"}}>
          💘 Chọn <strong>2 người</strong> để se duyên ({cupidPick.length}/2){cupidPick.length===2 && <> — <strong>{players[cupidPick[0]].name}</strong> ❤️ <strong>{players[cupidPick[1]].name}</strong></>}
        </div>
        <button style={{...st.pri,background:"linear-gradient(135deg,#ff6fa5,#c0398a)",opacity:cupidPick.length===2?1:0.35,pointerEvents:cupidPick.length===2?"auto":"none"}} onClick={confirmCupid}>💘 Xác nhận se duyên</button>
      </div>);
    }
    if(curPhase.id==="lovers"&&!dead) {
      bp={selectable:false};
      actUI=(<div style={{...st.ab,borderColor:"rgba(255,111,165,0.25)",background:"rgba(255,111,165,0.08)",color:"#ff9ec2"}}>
        💕 Cặp tình nhân: <strong>{lovers?players[lovers[0]].name:"?"}</strong> ❤️ <strong>{lovers?players[lovers[1]].name:"?"}</strong> — cho 2 người mở mắt nhận diện nhau
      </div>);
    }

    return (<div style={{...st.page,background:"linear-gradient(180deg,#040410 0%,#0c0422 50%,#040410 100%)"}}>
      <div style={st.stars}/><div style={st.w}>
        <div style={st.top}><span style={st.badge}>🌙 Đêm {round}</span><div style={{display:"flex",gap:6}}><button style={st.logBtn} onClick={()=>setShowLog(true)}>📜</button><span style={st.alv}>🧑{aliveP().length}</span></div></div>
        <div style={st.nBox}>
          <div style={{display:"flex",gap:5,marginBottom:4}}>{phases.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i===nightIdx?"#fff":i<nightIdx?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)",transform:i===nightIdx?"scale(1.4)":"scale(1)",transition:"all 0.3s"}}/>)}</div>
          <span style={{fontSize:40,filter:dead?"grayscale(0.8) opacity(0.4)":"drop-shadow(0 0 8px rgba(255,255,255,0.08))"}}>{curPhase.emoji}</span>
          <h2 style={{fontSize:17,fontWeight:800,margin:"2px 0",opacity:dead?0.45:1}}>{curPhase.name}{dead?"":" thức dậy"}</h2>
          {dead?(<div style={st.deadPh}><p style={{fontSize:12,color:"rgba(255,200,100,0.65)",margin:0}}>⚠ {curPhase.name} {curPhase.id==="cupid"?"đã se duyên xong":"đã chết"} — gọi giả</p><p style={{fontSize:10,color:"rgba(255,255,255,0.25)",margin:"3px 0 0"}}>Đợi vài giây rồi nhấn Tiếp</p></div>)
            :<p style={{fontSize:11,color:"rgba(255,255,255,0.35)",margin:"1px 0 0",lineHeight:1.5,maxWidth:300,textAlign:"center"}}>{curPhase.inst}</p>}
        </div>
        {!dead && actUI}
        {!dead && <Board {...bp}/>}
        <div style={st.r2}>
          <button style={{...st.ghost,opacity:nightIdx===0?0.3:1}} onClick={()=>nightIdx>0&&setNightIdx(nightIdx-1)} disabled={nightIdx===0}>← Trước</button>
          <button style={{...st.pri,opacity:blockNext?0.35:1,pointerEvents:blockNext?"none":"auto"}} onClick={nextNight}>{blockNext?"Xác nhận se duyên trước":nightIdx===phases.length-1?"☀️ Kết thúc đêm":dead?"Tiếp (skip) →":"Tiếp →"}</button>
        </div>
        <button style={st.endL} onClick={tryEndGame}>Kết thúc ván</button>
      </div>{seerRevealed&&<SeerPopup/>}{showLog&&<LogDrawer/>}{showEndConfirm&&<EndConfirm/>}</div>);
  }

  if(screen==="day_announce") return (<div style={{...st.page,background:"linear-gradient(180deg,#0e0e18 0%,#18122a 50%,#0e0e18 100%)"}}><div style={st.w}>
    <div style={st.top}><span style={st.badge}>☀️ Sáng ngày {round}</span><button style={st.logBtn} onClick={()=>setShowLog(true)}>📜</button></div>
    <div style={st.dBox}>
      <span style={{fontSize:40}}>🌅</span>
      <h2 style={{fontSize:17,fontWeight:800,margin:"3px 0 4px"}}>Kết quả đêm qua</h2>
      {nightDeaths.length===0 && <div style={st.peaceB}>🕊️ Đêm bình yên — không ai chết</div>}
      {nightDeaths.map(d=><div key={d.id} style={st.deathB}>💀 <strong>{players[d.id].name}</strong> — {d.cause}</div>)}
      {nightSaves.length>0 && <div style={st.saveB}>✨ Có người được cứu sống đêm qua</div>}
    </div>
    <Board selectable={false}/>
    <button style={st.pri} onClick={goDiscuss}>💬 Thảo luận</button>
    <button style={st.endL} onClick={tryEndGame}>Kết thúc ván</button>
  {showLog&&<LogDrawer/>}{showEndConfirm&&<EndConfirm/>}</div></div>);

  if(screen==="day") {
    const pct=timer/120;
    return (<div style={{...st.page,background:"linear-gradient(180deg,#0e0e18 0%,#18122a 50%,#0e0e18 100%)"}}><div style={st.w}>
      <div style={st.top}><span style={st.badge}>☀️ Ngày {round}</span><div style={{display:"flex",gap:6}}><button style={st.logBtn} onClick={()=>setShowLog(true)}>📜</button><span style={st.alv}>🧑{aliveP().length}</span></div></div>
      <div style={st.dBox}>
        <span style={{fontSize:34}}>💬</span><h2 style={{fontSize:17,fontWeight:800,margin:"2px 0"}}>Thảo Luận</h2>
        {!timerVis ? <button style={st.timerGo} onClick={()=>{setTimer(120);setTimerOn(true);setTimerVis(true);}}>⏱️ Đếm ngược 2:00</button>
        :(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 120 120" width="100" height="100"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/><circle cx="60" cy="60" r="52" fill="none" stroke={timer<=10?"#e74c3c":timer<=30?"#f39c12":"#2ecc71"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2*Math.PI*52}`} strokeDashoffset={`${2*Math.PI*52*(1-pct)}`} transform="rotate(-90 60 60)" style={{transition:"stroke-dashoffset 1s linear"}}/></svg>
              <span style={{position:"absolute",fontSize:26,fontWeight:800,fontVariantNumeric:"tabular-nums",color:timer<=10?"#e74c3c":timer<=30?"#f39c12":"#fff"}}>{fmt(timer)}</span>
            </div>
            {timer===0 && <p style={{fontSize:15,fontWeight:800,color:"#e74c3c",margin:0}}>⏰ HẾT GIỜ!</p>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
              {timerOn?<button style={st.tBtn} onClick={()=>setTimerOn(false)}>⏸</button>:timer>0?<button style={st.tBtn} onClick={()=>setTimerOn(true)}>▶</button>:null}
              <button style={st.tBtn} onClick={()=>{setTimer(120);setTimerOn(false);}}>🔄</button>
              <button style={{...st.tBtn,background:"rgba(46,204,113,0.12)",borderColor:"rgba(46,204,113,0.2)"}} onClick={()=>setTimer(t=>t+60)}>+1 phút</button>
              <button style={{...st.tBtn,background:"rgba(231,76,60,0.12)"}} onClick={()=>{setTimerOn(false);setTimerVis(false);}}>⏭ Skip</button>
            </div>
          </div>)}
      </div>
      <Board selectable={false}/>
      <button style={st.voteGo} onClick={goVote}>🗳️ Bỏ phiếu</button>
      <button style={st.endL} onClick={tryEndGame}>Kết thúc ván</button>
    {showLog&&<LogDrawer/>}{showEndConfirm&&<EndConfirm/>}</div></div>);
  }

  if(screen==="vote") return (<div style={{...st.page,background:"linear-gradient(180deg,#0e0808 0%,#220e0e 50%,#0e0808 100%)"}}><div style={st.w}>
    <div style={st.top}><span style={st.badge}>🗳️ Ngày {round}</span><button style={st.logBtn} onClick={()=>setShowLog(true)}>📜</button></div>
    <div style={{...st.nBox,borderColor:"rgba(231,76,60,0.08)"}}>
      <span style={{fontSize:34}}>🗳️</span><h2 style={{fontSize:17,fontWeight:800,margin:"2px 0"}}>Bỏ Phiếu</h2>
      <p style={{fontSize:11,color:"rgba(255,255,255,0.3)",margin:0}}>Chọn người treo trên bảng</p>
      {voteTarget!==null && <div style={st.ab}>🎯 <strong>{players[voteTarget].name}</strong></div>}
    </div>
    <Board selectable={true} onSelect={setVoteTarget} selectedId={voteTarget} mode="kill"/>
    <button style={{...st.killBtn,opacity:voteTarget!==null?1:0.3,pointerEvents:voteTarget!==null?"auto":"none"}} onClick={confirmVote}>💀 Treo cổ → Đêm</button>
    <button style={st.safeBtn} onClick={()=>{setVoteTarget(null);confirmVote();}}>✅ Không treo ai → Đêm</button>
    <button style={st.ghost} onClick={()=>setScreen("day")}>← Thảo luận</button>
    <button style={st.endL} onClick={tryEndGame}>Kết thúc ván</button>
  {showLog&&<LogDrawer/>}{showEndConfirm&&<EndConfirm/>}</div></div>);

  if(screen==="end") return (<div style={st.page}><div style={st.w}>
    <div style={{textAlign:"center",padding:"12px 0"}}>
      <span style={{fontSize:44}}>{winner==="wolf"?"🐺":winner==="village"?"🏘️":"🏁"}</span>
      <h2 style={st.h2}>{winner==="wolf"?"Phe Sói Thắng!":winner==="village"?"Phe Dân Thắng!":"Kết Thúc"}</h2>
      <p style={st.hint}>{round} vòng · {aliveP().length} sống sót</p>
    </div>
    <div style={st.card}>
      <div style={{...st.bTitle,marginBottom:6}}>📋 Kết quả</div>
      <div style={st.grid}>{players.map(p=>{const role=R(p.role);return(
        <div key={p.id} style={{...st.cell,opacity:p.alive?1:0.38,borderColor:p.alive?"rgba(46,204,113,0.25)":"rgba(231,76,60,0.15)"}}>
          <div style={st.cellR1}><span style={{fontSize:12,fontWeight:700,textDecoration:p.alive?"none":"line-through"}}>{p.name}{lovers&&lovers.includes(p.id)&&<span style={{fontSize:10,marginLeft:3}}>💕</span>}</span>{p.alive?<span style={{fontSize:9}}>✅</span>:<span style={{fontSize:10}}>💀</span>}</div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:12}}>{role.emoji}</span><span style={{fontSize:10,fontWeight:600,color:role.color}}>{role.name}</span></div>
          {!p.alive && <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",marginTop:1}}>Đêm {p.deathRound} · {p.deathCause}</div>}
        </div>);})}</div>
    </div>
    <div style={st.card}>
      <div style={{...st.bTitle,marginBottom:6}}>📜 Lịch sử</div>
      {gameLog.map((g,i)=>(
        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:5,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11}}>
          <span style={{...st.logB, background:g.type==="result"?"rgba(231,76,60,0.2)":g.type==="night"?"rgba(102,126,234,0.2)":g.type==="day"?"rgba(241,196,15,0.2)":"rgba(255,255,255,0.08)", color:g.type==="result"?"#e07070":g.type==="night"?"#8b9cf7":g.type==="day"?"#f0d060":"#999"}}>V{g.round}</span>
          <span style={{color:"rgba(255,255,255,0.55)",lineHeight:1.3}}>{g.text}</span>
        </div>
      ))}
    </div>
    <button style={st.pri} onClick={newGame}>🔄 Ván mới (giữ tên)</button>
    <button style={st.ghost} onClick={fullReset}>🔃 Reset hoàn toàn</button>
  </div></div>);

  return null;
}

const st = {
  page:{minHeight:"100vh",background:"linear-gradient(180deg,#0a0a16 0%,#151028 50%,#0a0a16 100%)",color:"#fff",fontFamily:"'Segoe UI',system-ui,sans-serif",position:"relative",overflow:"auto"},
  glow:{position:"absolute",top:-70,right:-30,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,200,0.06) 0%,transparent 70%)",pointerEvents:"none"},
  stars:{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:"radial-gradient(1px 1px at 20px 30px,rgba(255,255,255,0.2),transparent),radial-gradient(1px 1px at 80px 60px,rgba(255,255,255,0.15),transparent),radial-gradient(1px 1px at 160px 100px,rgba(255,255,255,0.12),transparent)",backgroundSize:"260px 150px"},
  w:{position:"relative",zIndex:1,maxWidth:400,margin:"0 auto",padding:"14px 10px 28px",display:"flex",flexDirection:"column",gap:8},
  h1:{fontSize:30,fontWeight:900,letterSpacing:6,margin:0,background:"linear-gradient(180deg,#fff 30%,#bfa0a0 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  sub:{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:4,textTransform:"uppercase",margin:"1px 0 0"},
  h2:{fontSize:17,fontWeight:800,margin:"3px 0 1px"},
  hint:{fontSize:11,color:"rgba(255,255,255,0.3)",margin:0},
  card:{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:10,border:"1px solid rgba(255,255,255,0.05)"},
  label:{fontSize:10,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:6},
  cen:{display:"flex",alignItems:"center",justifyContent:"center",gap:16},
  cBtn:{width:38,height:38,borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  pri:{width:"100%",padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 12px rgba(102,126,234,0.2)"},
  ghost:{flex:1,padding:"10px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center"},
  r2:{display:"flex",gap:6},
  idx:{width:20,height:20,borderRadius:6,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",flexShrink:0},
  inp:{flex:1,padding:"8px 9px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"},
  slBtn:{flex:1,padding:"8px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"center"},
  gRow:{display:"flex",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",gap:6},
  delBtn:{width:24,height:24,borderRadius:6,border:"1px solid rgba(231,76,60,0.15)",background:"rgba(231,76,60,0.08)",color:"#e74c3c",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  aRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 9px",borderRadius:9,border:"1px solid",cursor:"pointer",marginBottom:4},
  picker:{display:"flex",flexWrap:"wrap",gap:4,padding:"2px 2px 6px"},
  sugBtn:{padding:"7px",borderRadius:8,border:"1px solid rgba(102,126,234,0.2)",background:"rgba(102,126,234,0.08)",color:"#8b9cf7",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"center"},
  board:{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:8,border:"1px solid rgba(255,255,255,0.04)"},
  bHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5},
  bTitle:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)"},
  bStat:{fontSize:9,color:"rgba(255,255,255,0.25)"},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4},
  cell:{padding:"6px 7px",borderRadius:8,border:"1px solid",transition:"all 0.15s",position:"relative"},
  cellR1:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:1},
  disBadge:{position:"absolute",top:-2,right:-2,fontSize:10,background:"rgba(0,0,0,0.7)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"},
  top:{display:"flex",justifyContent:"space-between",alignItems:"center"},
  badge:{background:"rgba(255,255,255,0.07)",padding:"3px 10px",borderRadius:14,fontSize:11,fontWeight:600},
  alv:{fontSize:11,color:"rgba(255,255,255,0.35)"},
  logBtn:{padding:"3px 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.45)",fontSize:11,cursor:"pointer"},
  nBox:{background:"rgba(255,255,255,0.03)",borderRadius:14,padding:"18px 12px",border:"1px solid rgba(255,255,255,0.04)",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  ab:{padding:"6px 10px",borderRadius:8,background:"rgba(241,196,15,0.08)",border:"1px solid rgba(241,196,15,0.15)",fontSize:12,color:"#f1c40f",textAlign:"center",display:"flex",alignItems:"center",gap:4,justifyContent:"center",flexWrap:"wrap"},
  warn:{padding:"4px 8px",borderRadius:7,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",fontSize:10,color:"rgba(255,255,255,0.35)",textAlign:"center"},
  skipB:{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.06)",background:"transparent",color:"rgba(255,255,255,0.3)",fontSize:10,cursor:"pointer",textAlign:"center"},
  miniBtn:{padding:"2px 6px",borderRadius:5,border:"1px solid rgba(168,124,219,0.2)",background:"rgba(168,124,219,0.1)",color:"#a87cdb",fontSize:10,fontWeight:600,cursor:"pointer"},
  deadPh:{padding:"8px 10px",borderRadius:8,background:"rgba(255,200,100,0.05)",border:"1px solid rgba(255,200,100,0.1)",textAlign:"center"},
  witchP:{display:"flex",flexDirection:"column",gap:6,width:"100%"},
  witchInfo:{padding:"6px 10px",borderRadius:8,background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.12)",fontSize:12,textAlign:"center"},
  potBtn:{flex:1,padding:"8px 5px",borderRadius:8,border:"1px solid",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:"#fff"},
  used:{fontSize:8,color:"rgba(255,255,255,0.2)",fontStyle:"italic"},
  dBox:{background:"rgba(255,255,255,0.03)",borderRadius:14,padding:"18px 12px",border:"1px solid rgba(255,255,255,0.04)",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:5},
  peaceB:{width:"100%",padding:"8px",borderRadius:8,background:"rgba(46,204,113,0.06)",border:"1px solid rgba(46,204,113,0.12)",fontSize:13,color:"#58d68d"},
  deathB:{width:"100%",padding:"8px",borderRadius:8,background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.15)",fontSize:13},
  saveB:{width:"100%",padding:"6px",borderRadius:8,background:"rgba(46,204,113,0.06)",border:"1px solid rgba(46,204,113,0.12)",fontSize:12,color:"#2ecc71"},
  timerGo:{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2ecc71,#27ae60)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"},
  tBtn:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"},
  voteGo:{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#e74c3c,#c0392b)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"},
  killBtn:{width:"100%",padding:"12px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#e74c3c,#c0392b)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
  safeBtn:{width:"100%",padding:"12px",borderRadius:9,border:"1px solid rgba(46,204,113,0.2)",background:"rgba(46,204,113,0.08)",color:"#2ecc71",fontSize:13,fontWeight:700,cursor:"pointer"},
  endL:{padding:"8px",borderRadius:7,border:"1px solid rgba(255,255,255,0.04)",background:"transparent",color:"rgba(255,255,255,0.2)",fontSize:11,cursor:"pointer",textAlign:"center"},
  logOv:{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:100,display:"flex",justifyContent:"center",alignItems:"flex-end"},
  logPan:{width:"100%",maxWidth:420,maxHeight:"70vh",overflowY:"auto",background:"linear-gradient(180deg,#18122a,#0a0a16)",borderRadius:"14px 14px 0 0",padding:14,border:"1px solid rgba(255,255,255,0.06)"},
  logB:{padding:"1px 5px",borderRadius:4,fontSize:9,fontWeight:700,flexShrink:0,whiteSpace:"nowrap"},
  closeBtn:{width:24,height:24,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16},
  pop:{borderRadius:16,padding:"24px 20px",border:"2px solid",textAlign:"center",maxWidth:260,width:"100%"},
  popBtn:{marginTop:12,padding:"8px 18px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.1)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"},
};
