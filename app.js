import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =========================
   CONFIG (POOL FIXED = 0)
========================= */
const CHAIN_ID_DEC = 56;
const CHAIN_ID_HEX = "0x38";

const CONTRACT_ADDRESS = "0x15444214d8224874d5ED341a12D596073c32F0ed";
const THBC_ADDRESS     = "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb";
const PHL_ADDRESS      = "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5";

const POOL_ID = 0;              // ✅ FIX ตายตัว
const PACKAGE_SCAN_MAX = 10;    // 0..9

/* =========================
   ABI
========================= */
const STAKING_ABI = [
  "function poolCount() view returns (uint256)",
  "function getPool(uint256 poolId) view returns (address outToken,uint256 apyBP,uint256 lockSec,bool enabled,uint256 packageCount_)",
  "function getPackage(uint256 poolId,uint256 packageId) view returns (uint256 thbcIn,uint256 principalOut,bool active)",
  "function buyPackage(uint256 poolId,uint256 packageId)",
  "function getStakeCount(uint256 poolId,address user) view returns (uint256)",
  "function getStake(uint256 poolId,address user,uint256 index) view returns (uint256 principal,uint256 reward,uint256 startTime,uint256 lockSec,bool claimed)",
  "function canClaim(uint256 poolId,address user,uint256 index) view returns (bool)",
  "function claim(uint256 poolId,uint256 index)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 value) returns (bool)"
];

/* =========================
   DOM
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
   Provider picker (Bitget/MetaMask)
========================= */
async function pickInjectedProvider() {
  const eth = window.ethereum;

  // MetaMask/Bitget บางทีมี providers array
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
   Network
========================= */
async function ensureBSC(injected) {
  // บาง wallet switch ไม่ได้ ก็ไม่ให้แอปพัง (แต่เราจะแจ้ง netStatus)
  try {
    const cid = await injected.request({ method: "eth_chainId" });
    if (cid === CHAIN_ID_HEX) return true;

    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
    return true;
  } catch (e) {
    // ถ้า add chain ได้
    if (e?.code === 4902) {
      try {
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            blockExplorerUrls: ["https://bscscan.com/"],
          }]
        });
        return true;
      } catch { /* ignore */ }
    }
    return false;
  }
}

/* =========================
   State
========================= */
let provider, signer, user;
let stakingRO, stakingRW;
let thbcRO, thbcRW;
let phlRO;

let thbcDec = 18, phlDec = 18;
let thbcSym = "THBC", phlSym = "PHL";

let selectedPackageId = null;
let selectedPackage = null; // { thbcIn, principalOut, active }

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
   Pool sanity check
========================= */
async function assertPoolOk() {
  const pc = Number(await stakingRO.poolCount());
  if (pc <= POOL_ID) throw new Error(`BAD_POOL: poolCount=${pc} แต่ DApp ใช้ poolId=${POOL_ID}`);
  const p = await stakingRO.getPool(POOL_ID);
  if (!p.enabled) throw new Error("Pool ยังไม่เปิดใช้งาน (enabled=false)");
  // outToken ควรเป็น PHL (แต่ไม่บังคับ)
  return p;
}

/* =========================
   Package / Dropdown
========================= */
function renderPackageDetail(p) {
  selectedPackageId = p.id;
  selectedPackage = p;

  const thbcHuman = ethers.formatUnits(p.thbcIn, thbcDec);
  const outHuman  = ethers.formatUnits(p.principalOut, phlDec);

  $("pkgText").textContent = `${thbcHuman} ${thbcSym} = ${outHuman} ${phlSym} (Buy → Auto-Stake)`;
  $("pkgMeta").textContent = `Pool #${POOL_ID} • Package #${p.id} • active: ${p.active ? "true" : "false"}`;
  $("btnBuy").disabled = !p.active;

  // approve/buy enable จะอัปเดตใน refreshBalancesAndButtons()
}

async function loadPackage(id) {
  const pkg = await stakingRO.getPackage(POOL_ID, id);
  return { id, thbcIn: pkg.thbcIn, principalOut: pkg.principalOut, active: pkg.active };
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
  $("pkgHint").textContent = `Pool fixed = ${POOL_ID} • สแกน package 0-9 อัตโนมัติ`;

  sel.onchange = async () => {
    if (!sel.value) {
      selectedPackageId = null;
      selectedPackage = null;
      $("pkgText").textContent = "-";
      $("pkgMeta").textContent = "-";
      $("btnApprove").disabled = true;
      $("btnBuy").disabled = true;
      return;
    }

    const id = Number(sel.value);
    try {
      setMsg(`กำลังโหลด Package #${id} ...`, "warn");
      const p = await loadPackage(id);
      renderPackageDetail(p);
      await refreshBalancesAndButtons();
      setMsg("Package loaded ✅", "ok");
    } catch (e) {
      console.error(e);
      setMsg(`โหลดแพ็คเกจไม่สำเร็จ: ${e?.message || e}`, "bad");
    }
  };

  // auto-scan หา package active ตัวแรก
  setMsg("กำลังสแกนแพ็คเกจ (0-9) ...", "warn");
  let firstActive = null;
  for (let i = 0; i < PACKAGE_SCAN_MAX; i++) {
    try {
      const p = await loadPackage(i);
      if (p.active) { firstActive = p; break; }
    } catch { /* ignore */ }
  }

  if (firstActive) {
    sel.value = String(firstActive.id);
    renderPackageDetail(firstActive);
    setMsg(`พบแพ็คเกจ active: #${firstActive.id} ✅`, "ok");
  } else {
    $("pkgText").textContent = "-";
    $("pkgMeta").textContent = "-";
    setMsg("ไม่พบ package active ในช่วง 0-9 (ให้ owner ตั้ง setPackage)", "bad");
  }
}

/* =========================
   Balances / Allowance + Buttons
========================= */
async function refreshBalancesAndButtons() {
  if (!user) return;

  const [bal, allowance] = await Promise.all([
    thbcRO.balanceOf(user),
    thbcRO.allowance(user, CONTRACT_ADDRESS),
  ]);

  $("balThbc").textContent = `${ethers.formatUnits(bal, thbcDec)} ${thbcSym}`;
  $("allowText").textContent = `${ethers.formatUnits(allowance, thbcDec)} ${thbcSym}`;

  // buttons
  const hasPkg = selectedPackage && selectedPackageId !== null;
  if (!hasPkg) {
    $("btnApprove").disabled = true;
    $("btnBuy").disabled = true;
    return;
  }

  // ถ้า package ไม่ active -> ปิดทั้งคู่
  if (!selectedPackage.active) {
    $("btnApprove").disabled = true;
    $("btnBuy").disabled = true;
    return;
  }

  const need = selectedPackage.thbcIn;
  const enoughAllowance = allowance >= need;

  // Approve เปิดเมื่อ allowance ไม่พอ
  $("btnApprove").disabled = enoughAllowance;

  // Buy เปิดเมื่อ allowance พอ + balance พอ
  const enoughBal = bal >= need;
  $("btnBuy").disabled = !(enoughAllowance && enoughBal);
}

/* =========================
   Stake list / detail
========================= */
async function loadStakeList() {
  const sel = $("stakeSelect");
  sel.innerHTML = "";
  stakeIndex = null;

  const count = Number(await stakingRO.getStakeCount(POOL_ID, user));
  if (count === 0) {
    sel.disabled = true;
    sel.innerHTML = `<option value="">-</option>`;
    clearStakeUI();
    return 0;
  }

  // latest first
  for (let i = count - 1; i >= 0; i--) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `#${i}`;
    sel.appendChild(opt);
  }

  sel.disabled = false;
  stakeIndex = count - 1;
  sel.value = String(stakeIndex);
  return count;
}

async function loadStakeDetail() {
  if (stakeIndex === null) { clearStakeUI(); return; }

  const st = await stakingRO.getStake(POOL_ID, user, stakeIndex);
  const endTime = st.startTime + st.lockSec;

  $("stakeAmount").textContent = `${ethers.formatUnits(st.principal, phlDec)} ${phlSym}`;
  $("startTime").textContent = toLocalTime(st.startTime);
  $("endTime").textContent = toLocalTime(endTime);

  const can = await stakingRO.canClaim(POOL_ID, user, stakeIndex).catch(() => false);
  $("btnClaim").disabled = !(can && !st.claimed);

  $("stakeMeta").textContent =
    `Pool #${POOL_ID} • Index #${stakeIndex} • reward: ${ethers.formatUnits(st.reward, phlDec)} ${phlSym} • claimed: ${st.claimed ? "YES" : "NO"} • canClaim: ${can ? "YES" : "NO"}`;

  startCountdown(endTime);
}

/* =========================
   Actions
========================= */
async function approve() {
  if (!selectedPackage) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");
  setMsg(`กำลัง Approve ${thbcSym}...`, "warn");
  const tx = await thbcRW.approve(CONTRACT_ADDRESS, selectedPackage.thbcIn);
  await tx.wait();
  setMsg("Approve สำเร็จ ✅", "ok");
  await refreshBalancesAndButtons();
}

async function buy() {
  if (selectedPackageId === null) throw new Error("ยังไม่ได้เลือกแพ็คเกจ");
  setMsg("กำลัง Buy Package → Auto-Stake ...", "warn");
  const tx = await stakingRW.buyPackage(POOL_ID, selectedPackageId);
  await tx.wait();
  setMsg("✅ Buy + Auto-Stake สำเร็จ", "ok");
  await refreshAll();
}

async function claim() {
  if (stakeIndex === null) throw new Error("No stake to claim");
  setMsg("กำลัง Claim ...", "warn");
  const tx = await stakingRW.claim(POOL_ID, stakeIndex);
  await tx.wait();
  setMsg("✅ Claim สำเร็จ", "ok");
  await refreshAll();
}

/* =========================
   Refresh All
========================= */
async function refreshAll() {
  $("btnRefresh").disabled = true;

  await assertPoolOk();                 // ✅ กัน BAD_POOL ตั้งแต่ต้น
  await initPackageDropdown();          // โหลด/สแกนแพ็คเกจ
  await refreshBalancesAndButtons();    // allowance/balance/buttons
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

    // พยายามสลับ chain (ถ้าไม่ได้ก็แจ้ง network)
    await ensureBSC(injected).catch(() => {});

    provider = new ethers.BrowserProvider(injected);
    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    $("walletStatus").textContent = `✅ ${shortAddr(user)}`;
    $("netStatus").textContent = `Network: ${Number(net.chainId)}`;
    $("netStatus").className = `pill ${Number(net.chainId) === CHAIN_ID_DEC ? "pillOk" : "pillBad"}`;

    if (Number(net.chainId) !== CHAIN_ID_DEC) {
      setMsg("กรุณาเปลี่ยนเครือข่ายเป็น BSC Mainnet (chainId 56) ในกระเป๋า", "bad");
      return;
    }

    // contracts
    stakingRO = new ethers.Contract(CONTRACT_ADDRESS, STAKING_ABI, provider);
    stakingRW = new ethers.Contract(CONTRACT_ADDRESS, STAKING_ABI, signer);

    thbcRO = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, provider);
    thbcRW = new ethers.Contract(THBC_ADDRESS, ERC20_ABI, signer);

    phlRO  = new ethers.Contract(PHL_ADDRESS, ERC20_ABI, provider);

    // token meta
    [thbcDec, phlDec] = await Promise.all([
      thbcRO.decimals().catch(() => 18),
      phlRO.decimals().catch(() => 18),
    ]);
    [thbcSym, phlSym] = await Promise.all([
      thbcRO.symbol().catch(() => "THBC"),
      phlRO.symbol().catch(() => "PHL"),
    ]);

    // enable UI
    $("btnRefresh").disabled = false;

    setMsg("เชื่อมต่อสำเร็จ ✅ กำลังโหลดข้อมูล...", "ok");
    await refreshAll();
    setMsg("พร้อมใช้งาน ✅", "ok");

    // listeners
    if (injected?.on) {
      injected.on("accountsChanged", () => location.reload());
      injected.on("chainChanged", () => location.reload());
    }
  } catch (e) {
    console.error(e);
    setMsg(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
}

/* =========================
   Bind events
========================= */
$("btnConnect")?.addEventListener("click", connect);

$("btnRefresh")?.addEventListener("click", async () => {
  try {
    setMsg("กำลัง Refresh ...", "warn");
    await refreshAll();
    setMsg("อัปเดตข้อมูลแล้ว ✅", "ok");
  } catch (e) {
    console.error(e);
    setMsg(`Refresh ไม่สำเร็จ: ${e?.message || e}`, "bad");
  }
});

$("btnApprove")?.addEventListener("click", async () => {
  try {
    $("btnApprove").disabled = true;
    await approve();
  } catch (e) {
    console.error(e);
    setMsg(`Approve ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    await refreshBalancesAndButtons().catch(() => {});
  }
});

$("btnBuy")?.addEventListener("click", async () => {
  try {
    $("btnBuy").disabled = true;
    await buy();
  } catch (e) {
    console.error(e);
    setMsg(`Buy ไม่สำเร็จ: ${e?.message || e}`, "bad");
  } finally {
    await refreshBalancesAndButtons().catch(() => {});
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
    await loadStakeDetail().catch(() => {});
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

/* =========================
   Init
========================= */
setMsg("กด Connect Wallet เพื่อเริ่มใช้งาน", "muted");
$("btnRefresh").disabled = true;
$("btnApprove").disabled = true;
$("btnBuy").disabled = true;
$("btnClaim").disabled = true;
clearStakeUI();
