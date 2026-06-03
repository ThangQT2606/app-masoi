export const ROLES = [
  { id: "wolf",    name: "Sói",      emoji: "🐺", team: "evil", color: "#e74c3c", max: 99 },
  { id: "seer",    name: "Tiên Tri", emoji: "🔮", team: "good", color: "#a87cdb", max: 1  },
  { id: "guard",   name: "Bảo Vệ",  emoji: "🛡️", team: "good", color: "#5dade2", max: 1  },
  { id: "witch",   name: "Phù Thủy", emoji: "🧪", team: "good", color: "#58d68d", max: 1  },
  { id: "cupid",   name: "Cupid",    emoji: "💘", team: "good", color: "#ff6fa5", max: 1  },
  { id: "hunter",  name: "Thợ Săn", emoji: "🔫", team: "good", color: "#e67e22", max: 1  },
  { id: "villager",name: "Dân",      emoji: "👤", team: "good", color: "#aab7b8", max: 99 },
];

export const R = (id) => ROLES.find((r) => r.id === id) || ROLES.find((r) => r.id === "villager");

export const SUGGEST = {
  6:  { wolf:2, seer:1, guard:1, witch:1, villager:1 },
  8:  { wolf:2, seer:1, guard:1, witch:1, hunter:1, villager:2 },
  9:  { wolf:2, seer:1, guard:1, witch:1, cupid:1, hunter:1, villager:2 },
  10: { wolf:3, seer:1, guard:1, witch:1, cupid:1, hunter:1, villager:2 },
  12: { wolf:3, seer:1, guard:1, witch:1, cupid:1, hunter:1, villager:4 },
};

export const NIGHT_ORDER = [
  { id:"wolves", role:"wolf",  name:"Sói",      emoji:"🐺", inst:"Sói thức dậy — Đêm nay sói muốn cắn ai? — Sói đi ngủ." },
  { id:"guard",  role:"guard", name:"Bảo Vệ",   emoji:"🛡️", inst:"Bảo Vệ thức dậy — Đêm nay bảo vệ muốn bảo vệ ai? — Bảo Vệ đi ngủ." },
  { id:"seer",   role:"seer",  name:"Tiên Tri",  emoji:"🔮", inst:"Tiên Tri thức dậy — Tiên Tri đoán ai là sói? — Tiên Tri đi ngủ." },
  { id:"witch",  role:"witch", name:"Phù Thủy",  emoji:"🧪", inst:"Phù Thủy thức dậy — Đêm nay người này sẽ chết — Phù Thủy có muốn cứu không? — Phù Thủy có muốn giết ai không? — Phù Thủy đi ngủ." },
];

export const CUPID_PHASE  = { id:"cupid",  role:"cupid", name:"Cupid",   emoji:"💘", inst:"Cupid thức dậy — Cupid muốn se duyên ai? — Cupid đi ngủ." };
export const LOVERS_PHASE = { id:"lovers", role:null,    name:"Cặp đôi", emoji:"💕", inst:"Cặp đôi thức dậy, nhìn nhau để nhận diện — Cặp đôi đi ngủ." };
