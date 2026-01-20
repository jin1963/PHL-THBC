import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =========================
   CONFIG (single pool)
========================= */
const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

// ✅ สำคัญที่สุด: poolCount=1 → ใช้ได้แค่ poolId=0
const POOL_ID = 0;

const PACKAGE_SCAN_MAX = 10; // 0..9

/* =========================
   ABI
========================= */
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},
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

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

function toLocal(tsSec) {
  if (!tsSec || tsSec === 0n) return "-";
  return new Date(Number(tsSec) * 1000).toLocaleString();
}

function fmtCountdown(secLeft) {
  if (secLeft <= 0) return "00:00:00:00";
  const d = Math.floor(secLeft / 86400);
  const h = Math.floor((secLeft % 86400) / 3600);
  const m = Math.floor((secLeft % 3600) / 60);
  const s = Math.floor(secLeft % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* =========================
   Provider picker (Bitget)
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

async function ensureBSC() {
  const cid = await window.ethereum.request({ method: "eth_chainId" });
  if (cid === CHAIN_ID_HEX) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (e) {
    // ถ้า wallet บางตัวไม่รองรับ ก็ปล่อยให้ user เปลี่ยนเอง
    throw e;
  }
}

/* =========================
   State
========================= */
let provider, signer, user;
let contractRO, contractRW;
let thbcRO, phlRO;
let thbcDec = 18, phlDec = 18;
let thbcSym = "THBC", phlSym = "PHL";

let selectedPackageId = null;
let selectedPackage = null; // { thbcIn, principalOut }
let stakeIndex = null;
let timer = null;

/* =========================
   UI helpers
========================= */
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}
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
   Core loaders
========================= */
async function verifySinglePool() {
  const pc = await contractRO.poolCount();
  if (pc !== 1n) {
    throw new Error(`poolCount=${pc.toString()} (ไม่ใช่ single-pool)`);
  }
  // ทดลองเรียก getPool(0) เพื่อยืนยัน (ถ้าผิดจะ revert)
  const p = await contractRO.getPool(POOL_ID);
  if (!p.enabled) {
    throw new Error("Pool ยังไม่เปิดใช้งาน (enabled=false)");
  }
}

async function refreshBalances() {
  const [bal, allowance] = await Promise.all([
    thbcRO.balanceOf(user),
    thbcRO.allowance(user, CONTRACT_ADDRESS),
  ]);
  $("thbcBalText").textContent = `${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`;
  $("allowanceText").textContent = `${ethers.formatUnits(allowance, thbcDec)} ${thbcSym}`;
  return { bal, allowance };
}

function applyPackageView(p) {
  selectedPackageId = p.id;
  selectedPackage = { thbcIn: p.thbcIn, principalOut: p.principalOut };

  $("pkgText").textContent =
    `${ethers.formatUnits(p.thbcIn, thbcDec)} ${thbcSym} = ` +
    `${ethers.formatUnits(p.principalOut, phlDec)} ${phlSym} (Buy → Auto-Stake)`;

  $("pkgHint").textContent =
    `Pool #${POOL_ID} • Package #${p.id}`;

  $("btnBuy").disabled = false;
  $("btnApprove").disabled = false;
}

async function initPackageDropdown() {
  const sel = $("packageSelect");
  sel.disabled = false;

  sel.onchange = async () => {
    const v = sel.value;
    if (v === "") {
      selectedPackageId = null;
      selectedPackage = null;
      $("btnBuy").disabled = true;
      $("btnApprove").disabled = true;
      $("pkgText").textContent = "-";
      $("pkgHint").textContent = "กรุณาเลือกแพ็คเกจ";
      return;
    }
    const id = Number(v);
    try {
      setMsg(`กำลังโหลด Package #${id} ...`, "warn");
      const [thbcIn, principalOut, active] = await contractRO.getPackage(POOL_ID, id);
      if (!active) throw new Error(`Package #${id} ยังไม่ active`);
      applyPackageView({ id, thbcIn, principalOut });
      setMsg("Package loaded ✅", "ok");
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setMsg(`โหลดแพ็คเกจไม่สำเร็จ: ${e?.message || e}`, "bad");
    }
  };

  // auto scan หา package active ตัวแรก
  setMsg("กำลังสแกนแพ็คเกจ (0-9) ...", "warn");
  let first = null;
  for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
    try {
      const [thbcIn, principalOut, active] = await contractRO.getPackage(POOL_ID, i);
      if (active) { first = { id: i, thbcIn, principalOut }; break; }
    } catch {}
  }

  if (first) {
    sel.value = String(first.id);
    applyPackageView(first);
    setMsg(`พบแพ็คเกจ active: #${first.id} ✅`, "ok");
  } else {
    sel.value = "";
    selectedPackageId = null;
    selectedPackage = null;
    $("btnBuy").disabled = true;
    $("btnApprove").disabled = true;
    $("pkgText").textContent = "-";
    $("pkgHint").textContent = "ยังไม่มี package active (ให้ตั้งใน Owner/Remix: setPackage)";
    setMsg("ไม่พบแพ็คเกจ active ในช่วง 0-9", "bad");
  }
}

async function loadStakeList() {
  const sel = $("stakeSelect");
  sel.innerHTML = "";
  stakeIndex = null;

  let count = 0;
  try {
    count = Number(await contractRO.getStakeCount(POOL_ID, user));
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
    await contractRO.getStake(POOL_ID, user, stakeIndex);

  const endTime = startTime + lockSec;

  $("stakeAmount").textContent = `${ethers.formatUnits(principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocal(startTime);
  $("endTime").textContent = toLocal(endTime);

  $("stakeMeta").textContent =
    `Pool #${POOL_ID} • Index #${stakeIndex} • reward: ${ethers.formatUnits(reward, phlDec)} ${phlSym} • claimed: ${claimed ? "YES" : "NO"}`;

  let can = false;
  try { can = await contractRO.canClaim(POOL_ID, user, stakeIndex); } catch {}

  $("btnClaim").disabled = !(can && !claimed);
  startCountdown(endTime);
}

async function refreshAll() {
  $("btnRefresh").disabled = true;
  $("btnBuy").disabled = true;
  $("btnApprove").disabled = true;

  await verifySinglePool();
  await refreshBalances();
  await initPackageDropdown();
  await loadStakeList();
  await loadStakeDetail();

  $("btnRefresh").disabled = false;
  $("btnBuy").disabled = (selectedPackageId === null);
  $("btnApprove").disabled = (selectedPackageId === null);
}

/* =========================
   Actions
========================= */
async function approveSelected() {
  if (selectedPackageId === null) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");
  const [thbcIn] = await contractRO.getPackage(POOL_ID, selectedPackageId);
  setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
  const tx = await thbcRO.connect(signer).approve(CONTRACT_ADDRESS, thbcIn);
  await tx.wait();
  setMsg("Approve สำเร็จ ✅", "ok");
  await refreshBalances();
}

async function buySelected() {
  if (selectedPackageId === null || !selectedPackage) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");

  const { bal, allowance } = await refreshBalances();
  if (bal < selectedPackage.thbcIn) {
    throw new Error(`THBC ไม่พอ: มี ${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`);
  }

  if (allowance < selectedPackage.thbcIn) {
    setMsg("Allowance ไม่พอ → กด Approve THBC ก่อน", "bad");
    return;
  }

  setMsg("กำลัง Buy Package → Auto-Stake ...", "warn");
  const tx = await contractRW.buyPackage(POOL_ID, selectedPackageId);
  await tx.wait();

  setMsg("✅ Buy + Auto-Stake สำเร็จ", "ok");
  await refreshAll();
}

async function claim() {
  if (stakeIndex === null) throw new Error("No stake to claim");
  setMsg("กำลัง Claim ...", "warn");
  const tx = await contractRW.claim(POOL_ID, stakeIndex);
  await tx.wait();
  setMsg("✅ Claim สำเร็จ", "ok");
  await refreshAll();
}

/* =========================
   Connect
========================= */
async function connect() {
  try {
    const injected = await pickInjectedProvider();
    if (!injected) {
      setMsg("ไม่พบ Wallet provider (ให้เปิดผ่าน Bitget/MetaMask DApp Browser)", "bad");
      return;
    }

    setMsg("กำลังเชื่อมต่อ Wallet ...", "warn");

    // บาง wallet ไม่ชอบ switch — ถ้าพังก็ให้ user เปลี่ยนเอง
    try { await ensureBSC(); } catch {}

    provider = new ethers.BrowserProvider(injected);
    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    $("walletPill").textContent = `✅ ${shortAddr(user)}`;
    $("walletPill").className = `pill ok`;
    $("netPill").textContent = `Network: ${Number(net.chainId)}`;
    $("netPill").className = `pill ${Number(net.chainId) === CHAIN_ID_DEC ? "ok" : "bad"}`;

    contractRO = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    contractRW = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    thbcRO = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    phlRO  = new ethers.Contract(PHL_ADDRESS,  ERC20_ABI, provider);

    [thbcDec, phlDec] = await Promise.all([thbcRO.decimals(), phlRO.decimals()]);
    [thbcSym, phlSym] = await Promise.all([thbcRO.symbol(), phlRO.symbol()]);

    $("contractText").textContent = CONTRACT_ADDRESS;
    $("poolIdText").textContent = String(POOL_ID);

    $("packageSelect").disabled = false;
    $("btnRefresh").disabled = false;

    setMsg("เชื่อมต่อสำเร็จ ✅ กำลังโหลดข้อมูล...", "ok");
    await refreshAll();
    setMsg("พร้อมใช้งาน ✅", "ok");

    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", () => location.reload());
      window.ethereum.on("chainChanged", () => location.reload());
    }
  } catch (e) {
    console.error(e);
    setMsg(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
}

/* =========================
   Bind
========================= */
$("btnConnect")?.addEventListener("click", connect);

$("btnRefresh")?.addEventListener("click", async () => {
  try { setMsg("กำลัง Refresh ...", "warn"); await refreshAll(); setMsg("อัปเดตข้อมูลแล้ว ✅", "ok"); }
  catch (e) { console.error(e); setMsg(`Refresh ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
});

$("btnApprove")?.addEventListener("click", async () => {
  try { $("btnApprove").disabled = true; await approveSelected(); }
  catch (e) { console.error(e); setMsg(`Approve ไม่สำเร็จ: ${e?.message || e}`, "bad"); }
  finally { $("btnApprove").disabled = (selectedPackageId === null); }
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

/* =========================
   Init
========================= */
setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnBuy").disabled = true;
$("btnApprove").disabled = true;
$("btnRefresh").disabled = true;
$("btnClaim").disabled = true;
clearStakeUI();
