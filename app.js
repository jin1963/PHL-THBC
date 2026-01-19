/* app.js (FINAL v2 — Bitget-safe)
   - ethers v6 ESM (no "ethers is not defined")
   - BSC Mainnet (chainId 56)
   - Wallet: MetaMask + Bitget
   - User-only UI (no admin)
   - FIXED PoolId=0, PackageId=0
   - IMPORTANT: DOES NOT call getPool()  ✅ (fixes Bitget eth_call bug)
   - Reads only: poolCount, getPackage, getStakeCount, getStake, canClaim
   - Shows Your Stake: principal, start, end, realtime countdown
   - Claim enabled only when canClaim==true and claimed==false
*/

import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =========================
   CONFIG
========================= */
const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

// ✅ ยึดตามระบบคุณ
const POOL_ID = 0;
const PACKAGE_ID = 0;

// ✅ เรารู้สเปค pool อยู่แล้ว (แสดงแบบสากลโดยไม่ต้องอ่าน getPool)
const UI_TERM_DAYS = 365;
const UI_APY_TEXT = "30%";

/* =========================
   ABI
========================= */
const CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"_thbc","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeIndex","type":"uint256"}],"name":"BoughtAndAutoStaked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"stakeIndex","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"bool","name":"active","type":"bool"}],"name":"PackageSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"outToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolParamsUpdated","type":"event"},{"inputs":[],"name":"BPS_DENOM","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_PER_YEAR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"canClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"createPool","outputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"},{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"name":"setPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"setPoolParams","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"thbc","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

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

function setMsg(text, kind="muted") {
  const el = $("msg");
  el.className = `msg ${kind}`;
  el.textContent = text;
}
function shortAddr(a) { return a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-"; }
function toLocalTime(tsSec) { return (!tsSec || tsSec === 0n) ? "-" : new Date(Number(tsSec)*1000).toLocaleString(); }

function fmtCountdown(secLeft) {
  if (secLeft <= 0) return "00:00:00:00";
  const d = Math.floor(secLeft / 86400);
  const h = Math.floor((secLeft % 86400) / 3600);
  const m = Math.floor((secLeft % 3600) / 60);
  const s = Math.floor(secLeft % 60);
  const pad = (n) => String(n).padStart(2,"0");
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

async function ensureBSC() {
  const cid = await window.ethereum.request({ method: "eth_chainId" });
  if (cid === CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }]
    });
  } catch (e) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com/"]
        }]
      });
    } else {
      throw e;
    }
  }
}

/* =========================
   State
========================= */
let provider, signer, user;
let contractRO, contractRW;
let thbcTokenRO, phlTokenRO;
let thbcDec = 18, phlDec = 18;
let thbcSym = "THBC", phlSym = "PHL";
let pkg = null;             // { thbcIn, principalOut }
let stakeIndex = null;
let timer = null;

/* =========================
   Countdown
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
    if (left <= 0) {
      $("countdown").textContent = "00:00:00:00";
      $("countdownHint").textContent = "ครบกำหนดแล้ว";
    } else {
      $("countdown").textContent = fmtCountdown(left);
      $("countdownHint").textContent = "วัน:ชม:นาที:วิ";
    }
  };
  tick();
  timer = setInterval(tick, 1000);
}

/* =========================
   Loaders (Bitget-safe: no getPool)
========================= */
async function loadPackageOnly() {
  // verify pool exists via poolCount (safe)
  const pc = Number(await contractRO.poolCount());
  if (pc <= POOL_ID) throw new Error(`Pool not exists (poolCount=${pc})`);

  // show pool info as universal text (no on-chain getPool)
  $("termText") && ($("termText").textContent = `${UI_TERM_DAYS} days`);
  $("apyText") && ($("apyText").textContent = UI_APY_TEXT);
  $("pkgHint").textContent = `Pool #${POOL_ID} • Package #${PACKAGE_ID} • APY ${UI_APY_TEXT} • Lock ${UI_TERM_DAYS} days`;

  // read package (safe)
  const [thbcIn, principalOut, active] = await contractRO.getPackage(POOL_ID, PACKAGE_ID);
  if (!active) throw new Error("Package not active");

  pkg = { thbcIn, principalOut };

  $("pkgText").textContent =
    `${ethers.formatUnits(thbcIn, thbcDec)} ${thbcSym} = ${ethers.formatUnits(principalOut, phlDec)} ${phlSym} (Buy → Auto-Stake)`;

  $("btnBuy").disabled = false;
}

async function loadStakeList() {
  const count = Number(await contractRO.getStakeCount(POOL_ID, user));
  const sel = $("stakeSelect");
  sel.innerHTML = "";

  if (count === 0) {
    sel.disabled = true;
    sel.innerHTML = `<option value="">-</option>`;
    stakeIndex = null;
    $("stakeMeta").textContent = "ยังไม่มี stake";
    clearStakeUI();
    return;
  }

  const indices = [];
  for (let i = 0; i < count; i++) indices.push(i);
  indices.reverse();

  for (const i of indices) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `#${i}`;
    sel.appendChild(opt);
  }

  sel.disabled = false;
  stakeIndex = indices[0];
  sel.value = String(stakeIndex);
}

async function loadStakeDetail() {
  if (stakeIndex === null) { clearStakeUI(); return; }

  const [principal, reward, startTime, lockSec, claimed] =
    await contractRO.getStake(POOL_ID, user, stakeIndex);

  const endTime = startTime + lockSec;

  $("stakeAmount").textContent = `${ethers.formatUnits(principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocalTime(startTime);
  $("endTime").textContent = toLocalTime(endTime);

  $("stakeMeta").textContent =
    `Index #${stakeIndex} • reward: ${ethers.formatUnits(reward, phlDec)} ${phlSym} • claimed: ${claimed ? "YES" : "NO"}`;

  // claim button gating
  let can = false;
  try { can = await contractRO.canClaim(POOL_ID, user, stakeIndex); }
  catch { can = false; }

  $("btnClaim").disabled = !(can && !claimed);
  startCountdown(endTime);
}

async function refreshAll() {
  $("btnRefresh").disabled = true;
  $("btnBuy").disabled = true;

  await loadPackageOnly();
  await loadStakeList();
  await loadStakeDetail();

  $("btnRefresh").disabled = false;
}

/* =========================
   Actions
========================= */
async function buyPackage() {
  if (!pkg) throw new Error("Package not loaded");

  // nicer error: THBC balance
  const bal = await thbcTokenRO.balanceOf(user);
  if (bal < pkg.thbcIn) {
    throw new Error(`THBC ไม่พอ: มี ${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`);
  }

  // approve if needed
  const allowance = await thbcTokenRO.allowance(user, CONTRACT_ADDRESS);
  if (allowance < pkg.thbcIn) {
    setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
    const txA = await thbcTokenRO.connect(signer).approve(CONTRACT_ADDRESS, pkg.thbcIn);
    await txA.wait();
  }

  setMsg("กำลัง Buy Package → Auto-Stake ...", "warn");
  const tx = await contractRW.buyPackage(POOL_ID, PACKAGE_ID);
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

    thbcTokenRO = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    phlTokenRO  = new ethers.Contract(PHL_ADDRESS, ERC20_ABI, provider);

    [thbcDec, phlDec] = await Promise.all([thbcTokenRO.decimals(), phlTokenRO.decimals()]);
    [thbcSym, phlSym] = await Promise.all([thbcTokenRO.symbol(), phlTokenRO.symbol()]);

    $("btnRefresh").disabled = false;
    setMsg("เชื่อมต่อสำเร็จ ✅ กำลังโหลดข้อมูล...", "ok");

    try {
      await refreshAll();
      setMsg("พร้อมใช้งาน ✅", "ok");
    } catch (e) {
      console.error(e);
      setMsg(`เชื่อมต่อสำเร็จ ✅ แต่โหลดข้อมูลไม่สำเร็จ: ${e?.message || e}`, "warn");
      $("btnBuy").disabled = true;
      clearStakeUI();
      $("btnRefresh").disabled = false;
    }
  } catch (e) {
    console.error(e);
    setMsg(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
}

/* =========================
   Wire UI events
========================= */
$("btnConnect").addEventListener("click", connect);

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

$("btnBuy").addEventListener("click", async () => {
  try {
    $("btnBuy").disabled = true;
    await buyPackage();
  } catch (e) {
    console.error(e);
    setMsg(`Buy ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    try { await loadPackageOnly(); } catch {}
  }
});

$("btnClaim").addEventListener("click", async () => {
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

$("stakeSelect").addEventListener("change", async (ev) => {
  const v = ev.target.value;
  if (v === "") return;
  stakeIndex = Number(v);
  await loadStakeDetail().catch((e)=>{
    console.error(e);
    setMsg(`โหลด stake ไม่สำเร็จ: ${e?.message || e}`, "bad");
  });
});

// reload on wallet changes (stable for mobile)
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => location.reload());
  window.ethereum.on?.("chainChanged", () => location.reload());
}

/* =========================
   Init
========================= */
setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnBuy").disabled = true;
$("btnRefresh").disabled = true;
$("btnClaim").disabled = true;
clearStakeUI();
