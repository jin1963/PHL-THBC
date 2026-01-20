import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =========================
   CONFIG (ของคุณ)
========================= */
const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

const PACKAGE_SCAN_MAX = 10;

/* =========================
   ABI
========================= */
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"canClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"poolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)"
];

/* =========================
   DOM helpers
========================= */
const $ = (id) => document.getElementById(id);
function setMsg(text, kind = "muted") {
  const el = $("msg");
  if (!el) return;
  el.className = `msg ${kind}`;
  el.textContent = text;
}
function shortAddr(a) { return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-"; }

function toLocalTime(tsSec) {
  if (!tsSec) return "-";
  const n = Number(tsSec);
  if (!n) return "-";
  return new Date(n * 1000).toLocaleString();
}
function fmtCountdown(secLeft) {
  if (secLeft <= 0) return "00:00:00:00";
  const d = Math.floor(secLeft / 86400);
  const h = Math.floor((secLeft % 86400) / 3600);
  const m = Math.floor((secLeft % 3600) / 60);
  const s = Math.floor(secLeft % 60);
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* =========================
   Network
========================= */
async function ensureBSC(injected) {
  try {
    const cid = await injected.request({ method: "eth_chainId" });
    if (cid === CHAIN_ID_HEX) return true;
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
    return true;
  } catch {
    // บาง Bitget ไม่ให้ switch ก็ไม่เป็นไร แค่ให้ user อยู่ BSC
    return false;
  }
}

/* =========================
   Provider picker (Bitget fix)
========================= */
async function pickInjectedProvider() {
  const eth = window.ethereum;
  if (eth?.providers?.length) {
    return (
      eth.providers.find(x => x.isBitgetWallet) ||
      eth.providers.find(x => x.isBitKeep) ||
      eth.providers.find(x => x.isMetaMask) ||
      eth.providers[0]
    );
  }
  if (window.bitgetWallet?.ethereum) return window.bitgetWallet.ethereum;
  if (window.bitkeep?.ethereum) return window.bitkeep.ethereum;
  if (window.BitKeep?.ethereum) return window.BitKeep.ethereum;
  return eth || null;
}

/* =========================
   State
========================= */
let provider, signer, user;
let contractRO, contractRW;
let thbcRO, phlRO;
let thbcDec = 18, phlDec = 18;
let thbcSym = "THBC", phlSym = "PHL";

let ACTIVE_POOL_ID = null;           // ✅ auto-detect
let selectedPackageId = null;
let selectedPackage = null;          // { thbcIn, principalOut }
let stakeIndex = null;
let timer = null;

/* =========================
   UI helpers
========================= */
function stopTimer() { if (timer) clearInterval(timer); timer = null; }
function clearStakeUI() {
  $("stakeAmount").textContent = "-";
  $("startTime").textContent = "-";
  $("endTime").textContent = "-";
  $("countdown").textContent = "-";
  $("countdownHint").textContent = "-";
  $("stakeMeta").textContent = "-";
  $("btnClaim").disabled = true;
  stopTimer();
}
function startCountdown(endTimeSec) {
  stopTimer();
  const tick = () => {
    const now = Math.floor(Date.now() / 1000);
    const left = Number(endTimeSec) - now;
    $("countdown").textContent = left <= 0 ? "00:00:00:00" : fmtCountdown(left);
    $("countdownHint").textContent = left <= 0 ? "ครบกำหนดแล้ว" : "วัน:ชม:นาที:วิ";
  };
  tick();
  timer = setInterval(tick, 1000);
}

/* =========================
   Detect poolId (รองรับ 0-based / 1-based)
========================= */
async function detectActivePoolId() {
  const pc = Number(await contractRO.poolCount());
  if (!Number.isFinite(pc) || pc <= 0) throw new Error("poolCount invalid");

  // เราจะลองเรียกตั้งแต่ 0..pc (รวม pc) เพื่อรองรับ 1-based
  // เคสคุณ: pc=1 → จะลอง 0 แล้ว 1
  for (let i = 0; i <= pc; i++) {
    try {
      const p = await contractRO.getPool(i);
      // ถ้า call ได้ แปลว่า i อาจ valid
      if (p && typeof p.enabled === "boolean") {
        if (p.enabled) return i;
        // ถ้า call ได้แต่ไม่ enabled ก็ยังเก็บไว้เป็นตัวเลือกสุดท้าย
      }
    } catch {}
  }

  // ถ้าไม่มี enabled แต่ call ได้บ้าง ลองเอา 1 (ตามสัญญา 1-based) ก่อน
  for (let i = 0; i <= pc; i++) {
    try { await contractRO.getPool(i); return i; } catch {}
  }

  throw new Error("No enabled/valid pool found");
}

/* =========================
   Package dropdown
========================= */
function applyPackageView(p) {
  selectedPackageId = p.id;
  selectedPackage = { thbcIn: p.thbcIn, principalOut: p.principalOut };

  $("pkgText").textContent =
    `${ethers.formatUnits(p.thbcIn, thbcDec)} ${thbcSym}  →  ` +
    `${ethers.formatUnits(p.principalOut, phlDec)} ${phlSym} (Auto-Stake)`;

  $("btnBuy").disabled = false;
  $("btnApprove").disabled = false;
}

async function loadPackage(id) {
  const [thbcIn, principalOut, active] = await contractRO.getPackage(ACTIVE_POOL_ID, id);
  if (!active) throw new Error(`Package #${id} ยังไม่ active`);
  return { id, thbcIn, principalOut };
}

async function initPackageDropdown() {
  const sel = $("packageSelect");

  sel.innerHTML = `<option value="">— กรุณาเลือกแพ็คเกจ —</option>`;
  for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Package #${i}`;
    sel.appendChild(opt);
  }

  sel.disabled = false;
  sel.value = "";
  selectedPackageId = null;
  selectedPackage = null;
  $("btnBuy").disabled = true;
  $("btnApprove").disabled = true;

  sel.onchange = async () => {
    if (!sel.value) return;
    const id = Number(sel.value);
    try {
      setMsg(`กำลังโหลด Package #${id} ...`, "warn");
      const p = await loadPackage(id);
      applyPackageView(p);
      setMsg("Package loaded ✅", "ok");
      await refreshBalances(); // update allowance display
    } catch (e) {
      console.error(e);
      setMsg(`โหลดแพ็คเกจไม่สำเร็จ: ${e?.message || e}`, "bad");
      selectedPackageId = null;
      selectedPackage = null;
      $("btnBuy").disabled = true;
      $("btnApprove").disabled = true;
      $("pkgText").textContent = "-";
    }
  };

  // auto scan หา package active ตัวแรก
  setMsg("กำลังสแกนแพ็คเกจ (0-9) ...", "warn");
  for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
    try {
      const [thbcIn, principalOut, active] = await contractRO.getPackage(ACTIVE_POOL_ID, i);
      if (active) {
        sel.value = String(i);
        applyPackageView({ id: i, thbcIn, principalOut });
        setMsg(`พบแพ็คเกจ active: #${i} ✅`, "ok");
        return;
      }
    } catch {}
  }

  setMsg("ไม่พบแพ็คเกจ active ในช่วง 0-9 (ต้องตั้งใน Remix: setPackage)", "bad");
}

/* =========================
   Balances / Allowance
========================= */
async function refreshBalances() {
  if (!user) return;
  const [bal, allowance] = await Promise.all([
    thbcRO.balanceOf(user),
    thbcRO.allowance(user, CONTRACT_ADDRESS)
  ]);

  $("balText").textContent = `${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`;
  $("allowText").textContent = `${ethers.formatUnits(allowance, thbcDec)} ${thbcSym}`;
}

/* =========================
   Stake
========================= */
async function loadStakeList() {
  const sel = $("stakeSelect");
  sel.innerHTML = "";
  stakeIndex = null;

  let count = 0;
  try {
    count = Number(await contractRO.getStakeCount(ACTIVE_POOL_ID, user));
  } catch {
    sel.disabled = true;
    sel.innerHTML = `<option value="">-</option>`;
    clearStakeUI();
    return 0;
  }

  if (count === 0) {
    sel.disabled = true;
    sel.innerHTML = `<option value="">-</option>`;
    clearStakeUI();
    return 0;
  }

  // newest first
  const idx = [];
  for (let i = 0; i < count; i++) idx.push(i);
  idx.reverse();

  for (const i of idx) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `#${i}`;
    sel.appendChild(opt);
  }

  sel.disabled = false;
  stakeIndex = idx[0];
  sel.value = String(stakeIndex);
  return count;
}

async function loadStakeDetail() {
  if (stakeIndex === null) { clearStakeUI(); return; }

  const [principal, reward, startTime, lockSec, claimed] =
    await contractRO.getStake(ACTIVE_POOL_ID, user, stakeIndex);

  const endTime = startTime + lockSec;

  $("stakeAmount").textContent = `${ethers.formatUnits(principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocalTime(startTime);
  $("endTime").textContent = toLocalTime(endTime);

  $("stakeMeta").textContent =
    `Pool #${ACTIVE_POOL_ID} • Index #${stakeIndex} • reward: ${ethers.formatUnits(reward, phlDec)} ${phlSym} • claimed: ${claimed ? "YES" : "NO"}`;

  let can = false;
  try { can = await contractRO.canClaim(ACTIVE_POOL_ID, user, stakeIndex); } catch {}

  $("btnClaim").disabled = !(can && !claimed);
  startCountdown(endTime);
}

/* =========================
   Approve / Buy / Claim
========================= */
async function approveSelected() {
  if (!selectedPackage) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");
  setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
  const tx = await thbcRO.connect(signer).approve(CONTRACT_ADDRESS, selectedPackage.thbcIn);
  await tx.wait();
  setMsg("Approve สำเร็จ ✅", "ok");
  await refreshBalances();
}

async function buySelected() {
  if (selectedPackageId === null || !selectedPackage) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");

  const bal = await thbcRO.balanceOf(user);
  if (bal < selectedPackage.thbcIn) {
    throw new Error(`THBC ไม่พอ: มี ${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`);
  }

  const allowance = await thbcRO.allowance(user, CONTRACT_ADDRESS);
  if (allowance < selectedPackage.thbcIn) {
    throw new Error("Allowance ไม่พอ — กด Approve THBC ก่อน");
  }

  setMsg("กำลัง Buy Package → Auto-Stake ...", "warn");
  const tx = await contractRW.buyPackage(ACTIVE_POOL_ID, selectedPackageId);
  await tx.wait();
  setMsg("✅ Buy + Auto-Stake สำเร็จ", "ok");
  await refreshAll();
}

async function claim() {
  if (stakeIndex === null) throw new Error("No stake to claim");
  setMsg("กำลัง Claim ...", "warn");
  const tx = await contractRW.claim(ACTIVE_POOL_ID, stakeIndex);
  await tx.wait();
  setMsg("✅ Claim สำเร็จ", "ok");
  await refreshAll();
}

/* =========================
   Refresh All
========================= */
async function refreshAll() {
  $("btnRefresh").disabled = true;

  await refreshBalances();
  await initPackageDropdown();
  await loadStakeList();
  await loadStakeDetail();

  $("btnRefresh").disabled = false;
}

/* =========================
   Connect
========================= */
async function connect() {
  try {
    const injected = await pickInjectedProvider();
    if (!injected) {
      setMsg("ไม่พบ Wallet provider (ให้เปิดผ่าน Bitget DApp Browser / MetaMask)", "bad");
      return;
    }

    setMsg("กำลังเชื่อมต่อ Wallet ...", "warn");
    await ensureBSC(injected);

    provider = new ethers.BrowserProvider(injected);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    $("walletPill").textContent = `✅ ${shortAddr(user)}`;
    $("netPill").textContent = `Network: ${Number(net.chainId)}`;

    contractRO = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    contractRW = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    thbcRO = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    phlRO  = new ethers.Contract(PHL_ADDRESS, ERC20_ABI, provider);

    [thbcDec, phlDec] = await Promise.all([thbcRO.decimals(), phlRO.decimals()]);
    [thbcSym, phlSym] = await Promise.all([thbcRO.symbol(), phlRO.symbol()]);

    // ✅ auto-detect pool (รองรับ 1-based ของคุณ)
    setMsg("กำลังตรวจสอบ Pool ...", "warn");
    ACTIVE_POOL_ID = await detectActivePoolId();
    $("poolPill").textContent = `PoolId: ${ACTIVE_POOL_ID}`;

    $("packageSelect").disabled = false;
    $("btnRefresh").disabled = false;

    setMsg("เชื่อมต่อสำเร็จ ✅ กำลังโหลดข้อมูล...", "ok");
    await refreshAll();
    setMsg("พร้อมใช้งาน ✅", "ok");
  } catch (e) {
    console.error(e);
    setMsg(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
}

/* =========================
   Events
========================= */
$("btnConnect")?.addEventListener("click", connect);
$("btnRefresh")?.addEventListener("click", async () => {
  try { setMsg("กำลัง Refresh ...", "warn"); await refreshAll(); setMsg("อัปเดตข้อมูลแล้ว", "ok"); }
  catch (e) { console.error(e); setMsg(`Refresh ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
});

$("btnApprove")?.addEventListener("click", async () => {
  try { $("btnApprove").disabled = true; await approveSelected(); }
  catch (e) { console.error(e); setMsg(`Approve ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
  finally { $("btnApprove").disabled = !selectedPackage; }
});

$("btnBuy")?.addEventListener("click", async () => {
  try { $("btnBuy").disabled = true; await buySelected(); }
  catch (e) { console.error(e); setMsg(`Buy ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
  finally { $("btnBuy").disabled = (selectedPackageId === null); }
});

$("btnClaim")?.addEventListener("click", async () => {
  try { $("btnClaim").disabled = true; await claim(); }
  catch (e) { console.error(e); setMsg(`Claim ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
  finally { await loadStakeDetail().catch(()=>{}); }
});

$("stakeSelect")?.addEventListener("change", async (ev) => {
  const v = ev.target.value;
  if (v === "") return;
  stakeIndex = Number(v);
  await loadStakeDetail().catch((e) => {
    console.error(e);
    setMsg(`โหลด stake ไม่สำเร็จ: ${e?.message || e}`, "bad");
  });
});

setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnBuy").disabled = true;
$("btnApprove").disabled = true;
$("btnRefresh").disabled = true;
$("btnClaim").disabled = true;
clearStakeUI();
