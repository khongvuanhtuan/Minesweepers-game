/* --- Cấu hình độ khó --- */
const doKho = {
  de: { hang: 9, cot: 9, min: 10 },
  trungBinh: { hang: 16, cot: 16, min: 40 },
  kho: { hang: 16, cot: 30, min: 99 },
};

// Các biến toàn cục
const bangEl = document.getElementById("bangChoi");
const hienThiMinEl = document.getElementById("soMinConLai");
const boDemEl = document.getElementById("boDemThoiGian");
const nutChoiLaiEl = document.getElementById("nutChoiLai");
const chonMucDoEl = document.getElementById("mucDo");

let soHang = 9,
  soCot = 9,
  tongMin = 10; //đặt độ khó mặc định là dễ
let mangO = []; // Mảng lưu trạng thái từng ô
let lanDau = true; // Để tránh mìn xuất hiện ở lần click đầu tiên
let ketThuc = false; // Đã kết thúc game chưa
let minConLai = 0; // Hiển thị số mìn còn lại
let demGiay = 0; // Bộ đếm thời gian
let demInterval = null;

/* --- Hàm đặt độ khó --- */
function datDoKho(key) {
  if (key === "tuyChinh") return;
  const d = doKho[key];
  soHang = d.hang;
  soCot = d.cot;
  tongMin = d.min;
  document.documentElement.style.setProperty("--cot", soCot);
}

/* --- Tạo bảng trống --- */
function taoBangTrong() {
  // Tạo mảng các ô, mỗi ô là một đối tượng lưu trạng thái
  mangO = new Array(soHang * soCot)
    .fill(null)
    .map(() => ({ min: false, mo: false, co: false, so: 0, el: null }));
  bangEl.innerHTML = "";
  bangEl.style.setProperty("--cot", soCot);
  // Tạo phần tử HTML cho từng ô
  for (let i = 0; i < soHang * soCot; i++) {
    const o = document.createElement("div");
    o.className = "o";
    o.dataset.chiSo = i;
    // Gán sự kiện cho từng ô
    o.addEventListener("click", xuLyClickTrai);
    o.addEventListener("contextmenu", xuLyClickPhai);
    o.addEventListener("dblclick", xuLyDouble);
    mangO[i].el = o;
    bangEl.appendChild(o);
  }
  // Reset lại các biến trạng thái
  lanDau = true;
  ketThuc = false;
  demGiay = 0;
  capNhatBoDem();
  dungBoDem();
  minConLai = tongMin;
  capNhatSoMin();
}

/* --- Đặt mìn ngẫu nhiên --- */
function datMin(vitriDauTien) {
  // Không đặt mìn ở ô đầu tiên người chơi bấm và các ô lân cận
  const cam = new Set([vitriDauTien, ...lanGieng(vitriDauTien)]);
  let daDat = 0;

  while (daDat < tongMin) {
    const i = Math.floor(Math.random() * soHang * soCot);
    if (cam.has(i) || mangO[i].min) continue;
    mangO[i].min = true;
    daDat++;
  }

  // Tính số mìn xung quanh cho từng ô
  for (let i = 0; i < soHang * soCot; i++) {
    if (mangO[i].min) {
      mangO[i].so = -1;
      continue;
    }
    const so = lanGieng(i).filter((x) => mangO[x].min).length;
    mangO[i].so = so;
  }
}

/* --- Trả về danh sách các ô lân cận --- */
function lanGieng(idx) {
  const r = Math.floor(idx / soCot);
  const c = idx % soCot;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < soHang && nc >= 0 && nc < soCot) {
        out.push(nr * soCot + nc);
      }
    }
  }
  return out;
}

/* --- Sự kiện click chuột trái --- */
function xuLyClickTrai() {
  if (ketThuc) return;
  const i = +this.dataset.chiSo;
  if (lanDau) {
    datMin(i); // Chỉ đặt mìn sau lần click đầu
    batDauBoDem();
    lanDau = false;
  }
  moO(i); // Mở ô được click
}

/* --- Sự kiện click chuột phải (đặt hoặc gỡ cờ) --- */
function xuLyClickPhai(e) {
  e.preventDefault();
  if (ketThuc) return;
  const i = +this.dataset.chiSo;
  if (mangO[i].mo) return;
  mangO[i].co = !mangO[i].co;
  mangO[i].el.classList.toggle("co", mangO[i].co);
  minConLai += mangO[i].co ? -1 : 1;
  capNhatSoMin();
}

/* --- Double click để mở nhanh các ô xung quanh --- */
function xuLyDouble() {
  const i = +this.dataset.chiSo;
  moLanCan(i);
}

/* --- Hàm mở ô (có cả flood fill) --- */
function moO(i) {
  const o = mangO[i];
  if (o.mo || o.co) return;
  o.mo = true;
  o.el.classList.add("mo");
  o.el.classList.remove("co");
  o.el.textContent = "";

  // Nếu ô là mìn → thua
  if (o.min) {
    o.el.classList.add("min");
    o.el.textContent = "💣";
    ketThucTroChoi(false, i);
    return;
  }

  // Nếu có số mìn xung quanh → hiển thị số
  if (o.so > 0) {
    o.el.dataset.so = o.so;
    o.el.textContent = o.so;
  }
  // Nếu ô trống → dùng flood fill để mở lan
  else {
    const q = [i];
    while (q.length) {
      const cur = q.shift();
      lanGieng(cur).forEach((n) => {
        if (!mangO[n].mo && !mangO[n].co && !mangO[n].min) {
          mangO[n].mo = true;
          mangO[n].el.classList.add("mo");
          if (mangO[n].so > 0) {
            mangO[n].el.dataset.so = mangO[n].so;
            mangO[n].el.textContent = mangO[n].so;
          } else {
            q.push(n);
          }
        }
      });
    }
  }
  kiemTraThang();
}

/* --- Mở các ô lân cận khi double click vào ô đã mở --- */
function moLanCan(i) {
  if (ketThuc || !mangO[i].mo) return;
  const can = mangO[i].so;
  if (can <= 0) return;
  const xungQuanh = lanGieng(i);
  const daCo = xungQuanh.filter((n) => mangO[n].co).length;
  if (daCo === can) {
    xungQuanh.forEach((n) => {
      if (!mangO[n].co && !mangO[n].mo) moO(n);
    });
  }
}

/* --- Kiểm tra thắng --- */
function kiemTraThang() {
  const chuaMo = mangO.filter((o) => !o.mo).length;
  if (chuaMo === tongMin) ketThucTroChoi(true);
}

/* --- Kết thúc trò chơi --- */
function ketThucTroChoi(thang, noTai = null) {
  ketThuc = true;
  dungBoDem();
  if (!thang) {
    // Hiển thị toàn bộ mìn
    mangO.forEach((o, i) => {
      // XÓA CỜ trước
      o.co = false;
      o.el.classList.remove("co");

      // Nếu là mìn → hiển thị bom
      if (o.min) {
        o.el.classList.add("mo", "min");
        o.el.textContent = "💣";
      }
    });
    if (noTai !== null) mangO[noTai].el.style.outline = "2px solid #7f1d1d";
    setTimeout(() => alert("Bạn thua rồi 😅"), 80);
  } else {
    setTimeout(() => alert("🎉🥳🏆 Chiến thắng!🏆🥳🎉"), 80);
  }
}

/* --- Bộ đếm thời gian --- */
function batDauBoDem() {
  if (demInterval) return;
  demInterval = setInterval(() => {
    demGiay++;
    capNhatBoDem();
  }, 1000);
}
function dungBoDem() {
  if (demInterval) {
    clearInterval(demInterval);
    demInterval = null;
  }
}
function capNhatBoDem() {
  boDemEl.textContent = demGiay + "s";
}

/* --- Cập nhật hiển thị số mìn còn lại --- */
function capNhatSoMin() {
  hienThiMinEl.textContent = "Mìn: " + minConLai;
}

/* --- Chơi lại --- */
function choiLai() {
  taoBangTrong();
}

// Sự kiện khi bấm các nút hoặc thay đổi độ khó
nutChoiLaiEl.addEventListener("click", choiLai);

chonMucDoEl.addEventListener("change", () => {
  const v = chonMucDoEl.value;
  if (v === "tuyChinh") {
    const h = parseInt(prompt("Số hàng (5-40)", "16")) || 16;
    const c = parseInt(prompt("Số cột (5-60)", "30")) || 30;
    let m = parseInt(prompt("Số mìn (>=1)", "40")) || 40;

    soHang = Math.max(5, Math.min(40, h));
    soCot = Math.max(5, Math.min(60, c));

    const tongO = soHang * soCot;
    const gioiHan = Math.floor(tongO * 0.75);

    if (m > gioiHan) {
      alert(
        `⚠️ Số mìn quá nhiều!\nChỉ cho phép tối đa ${gioiHan} mìn (75% số ô).`
      );
      m = gioiHan;
    }

    tongMin = Math.max(1, Math.min(tongO - 1, m));

    document.documentElement.style.setProperty("--cot", soCot);
    choiLai();
  } else {
    datDoKho(v);
    choiLai();
  }
});

// Ngăn menu chuột phải
bangEl.addEventListener("contextmenu", (e) => e.preventDefault());

// Khởi tạo trò chơi
datDoKho("de");
choiLai();
