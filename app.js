import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =========================
   CONFIG
========================= */
const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

// ✅ poolCount=1 => poolId ที่ถูกต้องคือ 0
const POOL_ID = 0;

// package dropdown 0..9
const PACKAGE_SCAN_MAX = 10;

// UI แสดงแบบสากลตาม requirement (คงที่)
const UI_TERM_DAYS = 365;
const UI_APY_TEXT  = "30%";

/* =========================
   ABI
========================= */
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"_thbc","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeIndex","type":"uint256"}],"name":"BoughtAndAutoStaked","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"stakeIndex","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"}],"name":"Claimed","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"canClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
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

function toLocalTime(tsSec) {
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
   Network
========================= */
async function ensureBSC() {
  const cid = await window.ethereum.request({ method: "eth_chainId" });
  if (cid === CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (e) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            blockExplorerUrls: ["https://bscscan.com/"],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

/* =========================
   Provider picker (Bitget fix)
========================= */
async function pickInjectedProvider() {
  const eth = window.ethereum;

  // MetaMask/Bitget บางทีใส่ providers array
  if (eth?.providers?.length) {
    return (
      eth.providers.find(x => x.isBitgetWallet) ||
      eth.providers.find(x => x.isBitKeep) ||
      eth.providers.find(x => x.isMetaMask) ||
      eth.providers[0]
    );
  }

  // บาง Bitget inject ชื่ออื่น
  if (window.bitgetWallet?.ethereum) return window.bitgetWallet.ethereum;
  if (window.bitkeep?.ethereum) return window.bitkeep.ethereum;
  if (window.BitKeep?.ethereum) return window.BitKeep.ethereum;

  if (eth) return eth;
  return null;
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
   Timer / Stake UI
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
   Packages
========================= */
function applyPackageView(p) {
  selectedPackageId = p.id;
  selectedPackage = { thbcIn: p.thbcIn, principalOut: p.principalOut };

  $("pkgText").textContent =
    `${ethers.formatUnits(p.thbcIn, thbcDec)} ${thbcSym} = ` +
    `${ethers.formatUnits(p.principalOut, phlDec)} ${phlSym} (Buy → Auto-Stake)`;

  $("pkgHint").textContent =
    `Pool #${POOL_ID} • Package #${p.id} • APY ${UI_APY_TEXT} • Lock ${UI_TERM_DAYS} days`;

  $("btnBuy").disabled = false;
}

async function loadSelectedPackageFromChain(id) {
  const [thbcIn, principalOut, active] = await contractRO.getPackage(POOL_ID, id);
  if (!active) throw new Error(`Package #${id} ยังไม่ active`);
  return { id, thbcIn, principalOut };
}

async function initPackageDropdown() {
  const sel = $("packageSelect");
  if (!sel) return;

  // เติม option 0-9 (ถ้า HTML ยังไม่ได้ใส่)
  if (sel.options.length <= 1) {
    sel.innerHTML = `<option value="">— กรุณาเลือกแพ็คเกจ —</option>`;
    for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Package #${i}`;
      sel.appendChild(opt);
    }
  }

  sel.disabled = false;
  sel.value = "";

  sel.onchange = async () => {
    const v = sel.value;
    if (v === "") {
      selectedPackageId = null;
      selectedPackage = null;
      $("btnBuy").disabled = true;
      $("pkgText").textContent = "-";
      $("pkgHint").textContent = "กรุณาเลือกแพ็คเกจ";
      return;
    }

    const id = Number(v);
    try {
      setMsg(`กำลังโหลด Package #${id} ...`, "warn");
      const p = await loadSelectedPackageFromChain(id);
      applyPackageView(p);
      setMsg("Package loaded ✅", "ok");
    } catch (e) {
      console.error(e);
      selectedPackageId = null;
      selectedPackage = null;
      $("btnBuy").disabled = true;
      $("pkgText").textContent = "-";
      $("pkgHint").textContent = "-";
      setMsg(`โหลดแพ็คเกจไม่สำเร็จ: ${e?.message || e}`, "bad");
    }
  };

  // auto scan หา package active ตัวแรกใน 0-9
  setMsg("กำลังสแกนแพ็คเกจ (0-9) ...", "warn");
  let first = null;
  for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
    try {
      const [thbcIn, principalOut, active] = await contractRO.getPackage(POOL_ID, i);
      if (active) {
        first = { id: i, thbcIn, principalOut };
        break;
      }
    } catch { /* skip */ }
  }

  if (first) {
    sel.value = String(first.id);
    applyPackageView(first);
    setMsg(`พบแพ็คเกจ active: #${first.id} ✅`, "ok");
  } else {
    $("pkgText").textContent = "-";
    $("pkgHint").textContent = "ยังไม่มี package active (ต้องตั้งใน Remix: setPackage)";
    $("btnBuy").disabled = true;
    setMsg("ไม่พบแพ็คเกจ active ในช่วง 0-9", "bad");
  }
}

/* =========================
   Stake
========================= */
async function loadStakeList() {
  const sel = $("stakeSelect");
  if (!sel) return 0;

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
  if (stakeIndex === null) {
    clearStakeUI();
    return;
  }

  const [principal, reward, startTime, lockSec, claimed] =
    await contractRO.getStake(POOL_ID, user, stakeIndex);

  const endTime = startTime + lockSec;

  $("stakeAmount").textContent = `${ethers.formatUnits(principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocalTime(startTime);
  $("endTime").textContent = toLocalTime(endTime);

  $("stakeMeta").textContent =
    `Pool #${POOL_ID} • Index #${stakeIndex} • reward: ${ethers.formatUnits(reward, phlDec)} ${phlSym} • claimed: ${claimed ? "YES" : "NO"}`;

  let can = false;
  try {
    can = await contractRO.canClaim(POOL_ID, user, stakeIndex);
  } catch {
    can = false;
  }

  $("btnClaim").disabled = !(can && !claimed);
  startCountdown(endTime);
}

/* =========================
   Refresh All
========================= */
async function refreshAll() {
  $("btnRefresh").disabled = true;
  $("btnBuy").disabled = true;

  // ✅ verify poolId=0 exists
  const pc = Number(await contractRO.poolCount());
  if (pc <= POOL_ID) {
    throw new Error(`Pool not exists (poolCount=${pc}, need poolId=${POOL_ID})`);
  }

  await initPackageDropdown();
  await loadStakeList();
  await loadStakeDetail();

  $("btnRefresh").disabled = false;
  $("btnBuy").disabled = (selectedPackageId === null);
}

/* =========================
   Buy / Claim
========================= */
async function buySelected() {
  if (selectedPackageId === null || !selectedPackage) {
    throw new Error("ยังไม่ได้เลือกแพ็คเกจ");
  }

  const bal = await thbcRO.balanceOf(user);
  if (bal < selectedPackage.thbcIn) {
    throw new Error(`THBC ไม่พอ: มี ${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`);
  }

  const allowance = await thbcRO.allowance(user, CONTRACT_ADDRESS);
  if (allowance < selectedPackage.thbcIn) {
    setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
    const txA = await thbcRO.connect(signer).approve(CONTRACT_ADDRESS, selectedPackage.thbcIn);
    await txA.wait();
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
      setMsg("ไม่พบ Wallet provider (ให้เปิดผ่าน Bitget DApp Browser / MetaMask)", "bad");
      return;
    }

    setMsg("กำลังเชื่อมต่อ Wallet ...", "warn");

    // บาง Bitget อาจไม่รองรับ switch -> จับ error ไว้ ไม่ให้แอปพัง
    try { await ensureBSC(); } catch (e) { /* ignore */ }

    provider = new ethers.BrowserProvider(injected);
    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    $("walletStatus").textContent = `✅ ${shortAddr(user)}`;
    $("netStatus").textContent = `Network: ${Number(net.chainId)}`;
    $("netStatus").className =
      `pill ${Number(net.chainId) === CHAIN_ID_DEC ? "pillOk" : "pillBad"}`;

    contractRO = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    contractRW = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    thbcRO = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    phlRO  = new ethers.Contract(PHL_ADDRESS, ERC20_ABI, provider);

    [thbcDec, phlDec] = await Promise.all([thbcRO.decimals(), phlRO.decimals()]);
    [thbcSym, phlSym] = await Promise.all([thbcRO.symbol(), phlRO.symbol()]);

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
  try {
    setMsg("กำลัง Refresh ...", "warn");
    await refreshAll();
    setMsg("อัปเดตข้อมูลแล้ว", "ok");
  } catch (e) {
    console.error(e);
    setMsg(`Refresh ไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
});

$("btnBuy")?.addEventListener("click", async () => {
  try {
    $("btnBuy").disabled = true;
    await buySelected();
  } catch (e) {
    console.error(e);
    setMsg(`Buy ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    $("btnBuy").disabled = (selectedPackageId === null);
  }
});

$("btnClaim")?.addEventListener("click", async () => {
  try {
    $("btnClaim").disabled = true;
    await claim();
  } catch (e) {
    console.error(e);
    setMsg(`Claim ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    await loadStakeDetail().catch(()=>{});
  }
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

// บาง Bitget ไม่ยิง event นี้เสมอ แต่ใส่ไว้ไม่เสียหาย
if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

/* =========================
   Init
========================= */
setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnBuy").disabled = true;
$("btnRefresh").disabled = true;
$("btnClaim").disabled = true;
clearStakeUI();
