import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/** =========================
 *  CONFIG
 *  ========================= */
const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

// ✅ ล็อก PoolId ตามที่คุณยืนยัน
const FIXED_POOL_ID = 0;

// “35 THBC = 35 PHL” → เราจะหา package ที่ thbcIn ใกล้ 35 มากสุด + active
const TARGET_THBC = "35";

/** =========================
 *  ABI
 *  ========================= */
const CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"_thbc","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeIndex","type":"uint256"}],"name":"BoughtAndAutoStaked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"stakeIndex","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"bool","name":"active","type":"bool"}],"name":"PackageSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"outToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolParamsUpdated","type":"event"},{"inputs":[],"name":"BPS_DENOM","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_PER_YEAR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"canClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"createPool","outputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"},{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"name":"setPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"setPoolParams","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"thbc","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)"
];

/** =========================
 *  UI helpers
 *  ========================= */
const $ = (id) => document.getElementById(id);

function setMsg(text, kind = "muted") {
  const el = $("msg");
  el.className = `msg ${kind}`;
  el.textContent = text;
}
function shortAddr(a) { return a ? a.slice(0,6)+"..."+a.slice(-4) : "-"; }

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

async function ensureBSC() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === CHAIN_ID_HEX) return true;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
    return true;
  } catch (e) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com/"],
        }],
      });
      return true;
    }
    throw e;
  }
}

/** =========================
 *  State
 *  ========================= */
let provider, signer, user;
let contractRO, contractRW;
let thbcToken, phlToken;
let thbcDec = 18, phlDec = 18;
let thbcSym = "THBC", phlSym = "PHL";

let selectedPackageId = null;
let selectedPackage = null; // { thbcIn, principalOut, active }
let selectedStakeIndex = null;
let countdownTimer = null;

/** =========================
 *  Safe calls (กัน revert ทำหน้าแตก)
 *  ========================= */
async function safeGetPool(poolId) {
  try { return await contractRO.getPool(poolId); }
  catch { return null; }
}
async function safeGetPackage(poolId, packageId) {
  try { return await contractRO.getPackage(poolId, packageId); }
  catch { return null; }
}

/** =========================
 *  Load pool + find package (Pool=0)
 *  ========================= */
async function loadPoolAndFindPackage() {
  // 1) อ่าน pool 0 แบบปลอดภัย
  const pool = await safeGetPool(FIXED_POOL_ID);
  if (!pool) {
    $("pkgHint").textContent = "❌ อ่าน Pool#0 ไม่ได้ (getPool revert)";
    $("btnBuy").disabled = true;
    return;
  }

  const [outToken, apyBP, lockSec, enabled, packageCount_] = pool;

  // 2) เช็คว่าปลายทางเป็น PHL และ pool เปิด
  if (!enabled) {
    $("pkgHint").textContent = "❌ Pool#0 ถูกปิด (enabled = false)";
    $("btnBuy").disabled = true;
    return;
  }
  if ((outToken?.toLowerCase?.() || "") !== PHL_ADDRESS.toLowerCase()) {
    $("pkgHint").textContent = "❌ Pool#0 outToken ไม่ตรงกับ PHL";
    $("btnBuy").disabled = true;
    return;
  }

  const packageCount = Number(packageCount_);
  if (packageCount === 0) {
    $("pkgHint").textContent = "❌ Pool#0 ไม่มี package";
    $("btnBuy").disabled = true;
    return;
  }

  // 3) หา package ที่ active และ thbcIn ใกล้ 35 THBC
  const wantThbcIn = ethers.parseUnits(TARGET_THBC, thbcDec);
  let bestPkg = null;
  let bestDiff = null;

  for (let p = 0; p < packageCount; p++) {
    const pkg = await safeGetPackage(FIXED_POOL_ID, p);
    if (!pkg) continue;

    const [thbcIn, principalOut, active] = pkg;
    if (!active) continue;

    const diff = thbcIn > wantThbcIn ? (thbcIn - wantThbcIn) : (wantThbcIn - thbcIn);
    if (bestDiff === null || diff < bestDiff) {
      bestDiff = diff;
      bestPkg = { packageId: p, thbcIn, principalOut, active };
    }
  }

  if (!bestPkg) {
    $("pkgHint").textContent = "❌ ไม่พบ package ที่ active ใน Pool#0";
    $("btnBuy").disabled = true;
    return;
  }

  selectedPackageId = bestPkg.packageId;
  selectedPackage = bestPkg;

  const thbcText = ethers.formatUnits(bestPkg.thbcIn, thbcDec);
  const phlText  = ethers.formatUnits(bestPkg.principalOut, phlDec);

  $("pkgText").textContent = `${thbcText} ${thbcSym} = ${phlText} ${phlSym} (Buy → Auto-Stake)`;
  $("pkgHint").textContent = `Pool #0 • Package #${selectedPackageId} • APY ${Number(apyBP)/100}% • Lock ${Math.round(Number(lockSec)/86400)} days`;

  $("btnBuy").disabled = false;
}

/** =========================
 *  Stake UI
 *  ========================= */
async function loadStakeList() {
  const count = await contractRO.getStakeCount(FIXED_POOL_ID, user);
  const n = Number(count);

  const sel = $("stakeSelect");
  sel.innerHTML = "";

  if (n === 0) {
    sel.disabled = true;
    sel.innerHTML = `<option value="">-</option>`;
    selectedStakeIndex = null;
    $("stakeMeta").textContent = "ยังไม่มี stake ในระบบ";
    clearStakeUI();
    return;
  }

  const indices = [];
  for (let i = 0; i < n; i++) indices.push(i);
  indices.reverse(); // ล่าสุดบนสุด

  for (const idx of indices) {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `#${idx}`;
    sel.appendChild(opt);
  }

  sel.disabled = false;
  selectedStakeIndex = indices[0];
  sel.value = String(selectedStakeIndex);
}

function clearStakeUI() {
  $("stakeAmount").textContent = "-";
  $("startTime").textContent = "-";
  $("endTime").textContent = "-";
  $("countdown").textContent = "-";
  $("countdownHint").textContent = "-";
  $("btnClaim").disabled = true;
  stopCountdown();
}

async function loadSelectedStake() {
  if (selectedStakeIndex === null || selectedStakeIndex === undefined) {
    clearStakeUI();
    return;
  }

  const [principal, reward, startTime, lockSec, claimed] =
    await contractRO.getStake(FIXED_POOL_ID, user, selectedStakeIndex);

  $("stakeAmount").textContent = `${ethers.formatUnits(principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocalTime(startTime);

  const endTime = startTime + lockSec;
  $("endTime").textContent = toLocalTime(endTime);

  $("stakeMeta").textContent =
    `Index #${selectedStakeIndex} • reward: ${ethers.formatUnits(reward, phlDec)} ${phlSym} • claimed: ${claimed ? "YES" : "NO"}`;

  // ปุ่ม Claim เปิดเมื่อ canClaim && !claimed
  const can = await contractRO.canClaim(FIXED_POOL_ID, user, selectedStakeIndex);
  $("btnClaim").disabled = !(can && !claimed);

  startCountdown(endTime);
}

function startCountdown(endTimeSec) {
  stopCountdown();

  const tick = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const end = Number(endTimeSec);
    const left = end - nowSec;

    if (left <= 0) {
      $("countdown").textContent = "00:00:00:00";
      $("countdownHint").textContent = "ครบกำหนดแล้ว";
    } else {
      $("countdown").textContent = fmtCountdown(left);
      $("countdownHint").textContent = "วัน:ชม:นาที:วิ";
    }
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}
function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

/** =========================
 *  Actions
 *  ========================= */
async function doBuyPackage() {
  if (selectedPackageId === null || !selectedPackage) {
    throw new Error("ยังหา Package ไม่เจอ");
  }

  // 1) approve THBC
  const thbcIn = selectedPackage.thbcIn;
  const allowance = await thbcToken.allowance(user, CONTRACT_ADDRESS);

  if (allowance < thbcIn) {
    setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
    const txA = await thbcToken.connect(signer).approve(CONTRACT_ADDRESS, thbcIn);
    await txA.wait();
  }

  // 2) buyPackage (TX)
  setMsg("กำลัง Buy Package → Auto-Stake ...", "warn");
  const tx = await contractRW.buyPackage(FIXED_POOL_ID, selectedPackageId);
  await tx.wait();

  setMsg("✅ ซื้อแพ็คเกจและทำ Auto-Stake สำเร็จ", "ok");
  await refreshAll();
}

async function doClaim() {
  if (selectedStakeIndex === null) return;

  setMsg("กำลัง Claim ...", "warn");
  const tx = await contractRW.claim(FIXED_POOL_ID, selectedStakeIndex);
  await tx.wait();

  setMsg("✅ Claim สำเร็จ", "ok");
  await refreshAll();
}

async function refreshAll() {
  $("btnRefresh").disabled = true;

  await loadPoolAndFindPackage();
  await loadStakeList();
  await loadSelectedStake();

  $("btnRefresh").disabled = false;
}

/** =========================
 *  Connect
 *  ========================= */
async function connect() {
  if (!window.ethereum) {
    setMsg("ไม่พบ Wallet (MetaMask/Bitget) กรุณาติดตั้งหรือเปิดใน Browser ของ Wallet", "bad");
    return;
  }

  try {
    setMsg("กำลังเชื่อมต่อ Wallet ...", "warn");
    await ensureBSC();

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    $("walletStatus").textContent = `✅ ${shortAddr(user)}`;
    $("netStatus").textContent = `Network: ${Number(net.chainId)}`;
    $("netStatus").className = `pill ${Number(net.chainId) === CHAIN_ID_DEC ? "pillOk" : "pillBad"}`;

    contractRO = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    contractRW = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    thbcToken = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    phlToken  = new ethers.Contract(PHL_ADDRESS, ERC20_ABI, provider);

    // metadata
    [thbcDec, phlDec] = await Promise.all([thbcToken.decimals(), phlToken.decimals()]);
    [thbcSym, phlSym] = await Promise.all([thbcToken.symbol(), phlToken.symbol()]);

    // enable buttons
    $("btnRefresh").disabled = false;

    setMsg("เชื่อมต่อสำเร็จ ✅ กำลังโหลดข้อมูล...", "ok");

    // สำคัญ: refresh แบบไม่ทำให้ connect ล้ม
    try {
      await refreshAll();
      setMsg("พร้อมใช้งาน ✅", "ok");
    } catch (e) {
      console.error(e);
      setMsg("เชื่อมต่อสำเร็จ ✅ แต่โหลดข้อมูลบางส่วนไม่สำเร็จ (ลอง Refresh อีกครั้ง)", "warn");
    }

  } catch (e) {
    console.error(e);
    setMsg(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
}

/** =========================
 *  Events / Init
 *  ========================= */
$("btnConnect").addEventListener("click", connect);

$("btnBuy").addEventListener("click", async () => {
  try {
    $("btnBuy").disabled = true;
    await doBuyPackage();
  } catch (e) {
    console.error(e);
    setMsg(`Buy ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    // จะถูกเปิดจาก loadPoolAndFindPackage() อีกที
    await loadPoolAndFindPackage().catch(()=>{});
  }
});

$("btnRefresh").addEventListener("click", async () => {
  try {
    setMsg("กำลัง Refresh ...", "warn");
    await refreshAll();
    setMsg("อัปเดตข้อมูลแล้ว", "ok");
  } catch (e) {
    console.error(e);
    setMsg(`Refresh ไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
});

$("btnClaim").addEventListener("click", async () => {
  try {
    $("btnClaim").disabled = true;
    await doClaim();
  } catch (e) {
    console.error(e);
    setMsg(`Claim ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    await loadSelectedStake().catch(()=>{});
  }
});

$("stakeSelect").addEventListener("change", async (ev) => {
  const v = ev.target.value;
  if (v === "") return;
  selectedStakeIndex = Number(v);
  try {
    await loadSelectedStake();
  } catch (e) {
    console.error(e);
    setMsg(`โหลด stake ไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
});

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}

setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnBuy").disabled = true;
$("btnRefresh").disabled = true;
