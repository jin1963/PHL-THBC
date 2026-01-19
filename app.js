/* ========= THBC → PHL Auto-Stake (Single Page DApp) =========
   - MetaMask / Bitget Wallet
   - BSC Mainnet (chainId 56)
   - Contract: THBC_MultiPool_AutoStake
============================================================ */

const CONFIG = {
  CHAIN_ID_DEC: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC Mainnet",
  RPCS: ["https://bsc-dataseed.binance.org/"],
  EXPLORER: "https://bscscan.com",

  CONTRACT: "0x15444214d8224874d5ED341a12D596073c32F0ed",
  THBC: "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb",
  // PHL address จริง (จากคุณ)
  PHL: "0xffeb0234a85a46F8Fdf6b8dEEFd2b4C7cB503df5",

  DEFAULT_POOL_ID: 1,
  DEFAULT_PACKAGE_ID: 1,
};

// ===== ABI: Contract (ตามที่คุณส่งล่าสุด) =====
const CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"_thbc","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeIndex","type":"uint256"}],"name":"BoughtAndAutoStaked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"stakeIndex","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"packageId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"thbcIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"principalOut","type":"uint256"},{"indexed":false,"internalType":"bool","name":"active","type":"bool"}],"name":"PackageSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":true,"internalType":"address","name":"outToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"poolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"apyBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lockSec","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"PoolParamsUpdated","type":"event"},{"inputs":[],"name":"BPS_DENOM","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_PER_YEAR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"buyPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"canClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"createPool","outputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"}],"name":"getPackage","outputs":[{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"outToken","type":"address"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"packageCount_","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"getStakeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"packageId","type":"uint256"},{"internalType":"uint256","name":"thbcIn","type":"uint256"},{"internalType":"uint256","name":"principalOut","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"name":"setPackage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"apyBP","type":"uint256"},{"internalType":"uint256","name":"lockSec","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"}],"name":"setPoolParams","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"thbc","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

// ===== Minimal ERC20 ABI =====
const ERC20_ABI = [
  {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
  {"constant":true,"inputs":[{"name":"a","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":true,"inputs":[{"name":"o","type":"address"},{"name":"s","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"s","type":"address"},{"name":"v","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
];

let provider;
let account = null;
let chainId = null;

let contract;
let thbc;
let outToken;

let thbcDecimals = 18;
let outDecimals = 18;

let countdownTimer = null;

// ========= DOM =========
const $ = (id) => document.getElementById(id);

// ========= Helpers =========
function shortAddr(a){
  if(!a) return "-";
  return a.slice(0,6) + "..." + a.slice(-4);
}
function setStatus(text, type="muted"){
  const el = $("status");
  el.textContent = text;
  el.className = "status " + type;
}
function fmtUnits(raw, decimals){
  const s = BigInt(raw).toString();
  if (decimals === 0) return s;
  const pad = s.padStart(decimals+1, "0");
  const int = pad.slice(0, -decimals);
  let frac = pad.slice(-decimals);
  frac = frac.replace(/0+$/,"");
  return frac ? `${int}.${frac}` : int;
}
function toUnitsFloat(raw, decimals){
  return Number(fmtUnits(raw, decimals));
}
function fmtNum(n, max=6){
  if (!isFinite(n)) return "-";
  return n.toLocaleString(undefined,{maximumFractionDigits:max});
}
function secToHuman(sec){
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400)/3600);
  const m = Math.floor((sec % 3600)/60);
  if (d > 0) return `${d} days ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function unixToLocal(ts){
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}
function nowSec(){ return Math.floor(Date.now()/1000); }

async function ensureBSC(){
  const current = await provider.request({ method:"eth_chainId" });
  if (current === CONFIG.CHAIN_ID_HEX) return true;

  // พยายาม switch (Bitget/MetaMask ส่วนใหญ่รองรับ)
  try{
    await provider.request({
      method:"wallet_switchEthereumChain",
      params:[{ chainId: CONFIG.CHAIN_ID_HEX }]
    });
    return true;
  }catch(e){
    // ถ้า chain ยังไม่ถูกเพิ่ม
    if (e && (e.code === 4902 || (""+e.message).includes("Unrecognized chain"))){
      await provider.request({
        method:"wallet_addEthereumChain",
        params:[{
          chainId: CONFIG.CHAIN_ID_HEX,
          chainName: CONFIG.CHAIN_NAME,
          nativeCurrency:{ name:"BNB", symbol:"BNB", decimals:18 },
          rpcUrls: CONFIG.RPCS,
          blockExplorerUrls: [CONFIG.EXPLORER],
        }]
      });
      return true;
    }
    throw e;
  }
}

// กัน error แบบในรูป: “already pending”
function isPendingReq(err){
  const msg = (err && err.message) ? err.message : "";
  return err && (err.code === -32002 || msg.includes("already pending") || msg.includes("Request of type"));
}

// ========= Core =========
async function connectWallet(){
  if (!window.ethereum){
    setStatus("ไม่พบ Wallet (MetaMask/Bitget) ในเบราว์เซอร์นี้", "bad");
    return;
  }
  provider = window.ethereum;

  $("btnConnect").disabled = true;
  setStatus("กำลังเชื่อมต่อ...", "warn");

  try{
    // ขอ accounts (อย่า call ซ้ำรัว ๆ)
    const accs = await provider.request({ method:"eth_requestAccounts" });
    account = accs && accs[0] ? accs[0] : null;

    chainId = await provider.request({ method:"eth_chainId" });

    // ต้องเป็น BSC
    if (chainId !== CONFIG.CHAIN_ID_HEX){
      setStatus("กำลังสลับไป BSC Mainnet...", "warn");
      await ensureBSC();
      chainId = await provider.request({ method:"eth_chainId" });
    }

    // init contracts
    contract = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, new ethers.BrowserProvider(provider));
    // NOTE: ethers.BrowserProvider ต้องดึง signer ตอนส่ง tx
    // สำหรับ call view ใช้ provider call ผ่าน BrowserProvider ได้เลย

    // สร้าง token instance (จะ set decimals ทีหลัง)
    thbc = new ethers.Contract(CONFIG.THBC, ERC20_ABI, new ethers.BrowserProvider(provider));
    outToken = new ethers.Contract(CONFIG.PHL, ERC20_ABI, new ethers.BrowserProvider(provider));

    $("net").textContent = `${CONFIG.CHAIN_NAME} (chainId ${CONFIG.CHAIN_ID_DEC})`;
    $("wallet").textContent = `${shortAddr(account)} (${account})`;
    $("contract").textContent = CONFIG.CONTRACT;

    $("poolId").value = String(CONFIG.DEFAULT_POOL_ID);
    $("packageId").value = String(CONFIG.DEFAULT_PACKAGE_ID);

    setStatus("Connected ✅", "ok");

    // listeners
    provider.on?.("accountsChanged", () => location.reload());
    provider.on?.("chainChanged", () => location.reload());

    await initDecimals();
    await refreshBalances();
    await loadPool();
    await loadPackage();
    await refreshStakes();

  }catch(err){
    console.error(err);
    if (isPendingReq(err)){
      setStatus("มีหน้าต่างอนุมัติ Wallet ค้างอยู่ — กรุณาเปิด Wallet แล้วกดอนุมัติ/ปฏิเสธก่อน", "warn");
    }else{
      setStatus("เชื่อมต่อไม่สำเร็จ: " + (err?.message || err), "bad");
    }
  }finally{
    $("btnConnect").disabled = false;
  }
}

async function initDecimals(){
  try{
    thbcDecimals = Number(await thbc.decimals());
  }catch{ thbcDecimals = 18; }
  try{
    outDecimals = Number(await outToken.decimals());
  }catch{ outDecimals = 18; }
}

async function refreshBalances(){
  if (!account) return;

  $("btnRefresh").disabled = true;
  try{
    const [bThbc, bOut, allow] = await Promise.all([
      thbc.balanceOf(account),
      outToken.balanceOf(account),
      thbc.allowance(account, CONFIG.CONTRACT),
    ]);

    $("balTHBC").textContent = `${fmtNum(toUnitsFloat(bThbc, thbcDecimals), 6)} THBC`;
    $("balPHL").textContent  = `${fmtNum(toUnitsFloat(bOut, outDecimals), 6)} PHL`;
    $("allowTHBC").textContent = `${fmtNum(toUnitsFloat(allow, thbcDecimals), 6)} THBC`;
  }catch(err){
    console.error(err);
    setStatus("Refresh balance ไม่สำเร็จ: " + (err?.message || err), "bad");
  }finally{
    $("btnRefresh").disabled = false;
  }
}

async function loadPool(){
  if (!account) return;

  $("btnLoadPool").disabled = true;
  try{
    const poolId = Number($("poolId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, bp);

    const pool = await c.getPool(poolId);
    const outAddr = pool[0];
    const apyBP = pool[1];
    const lockSec = pool[2];
    const enabled = pool[3];

    $("outToken").textContent = outAddr;
    $("apyShow").textContent = `${Number(apyBP)/100}% (BPS ${apyBP})`;
    $("lockShow").textContent = `${secToHuman(Number(lockSec))} (${Number(lockSec)} sec)`;
    $("enabledShow").textContent = String(enabled);

    // ถ้า out token เปลี่ยนตาม pool ก็อัปเดต outToken instance + decimals
    if (outAddr && outAddr.toLowerCase() !== CONFIG.PHL.toLowerCase()){
      outToken = new ethers.Contract(outAddr, ERC20_ABI, new ethers.BrowserProvider(provider));
      await initDecimals();
      await refreshBalances();
    }

  }catch(err){
    console.error(err);
    setStatus("Load Pool ไม่สำเร็จ: " + (err?.message || err), "bad");
  }finally{
    $("btnLoadPool").disabled = false;
  }
}

async function loadPackage(){
  if (!account) return;

  $("btnLoadPkg").disabled = true;
  try{
    const poolId = Number($("poolId").value || 1);
    const packageId = Number($("packageId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, bp);

    const pkg = await c.getPackage(poolId, packageId);
    const thbcIn = pkg[0];
    const principalOut = pkg[1];
    const active = pkg[2];

    $("pkgTHBC").textContent = `${fmtNum(toUnitsFloat(thbcIn, thbcDecimals), 6)} THBC`;
    $("pkgOut").textContent  = `${fmtNum(toUnitsFloat(principalOut, outDecimals), 6)} PHL`;
    $("pkgActive").textContent = String(active);

    $("msgBuy").textContent = active ? "Package loaded ✅" : "Package inactive ❌";
    $("msgBuy").className = "status " + (active ? "ok" : "bad");

  }catch(err){
    console.error(err);
    setStatus("Load Package ไม่สำเร็จ: " + (err?.message || err), "bad");
  }finally{
    $("btnLoadPkg").disabled = false;
  }
}

async function approveTHBC(){
  if (!account) return;

  $("btnApprove").disabled = true;
  try{
    const poolId = Number($("poolId").value || 1);
    const packageId = Number($("packageId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, bp);
    const pkg = await c.getPackage(poolId, packageId);
    const thbcIn = pkg[0];

    const signer = await bp.getSigner();
    const tokenWithSigner = new ethers.Contract(CONFIG.THBC, ERC20_ABI, signer);

    $("msgBuy").textContent = "กำลัง Approve THBC...";
    $("msgBuy").className = "status warn";

    const tx = await tokenWithSigner.approve(CONFIG.CONTRACT, thbcIn);
    await tx.wait();

    $("msgBuy").textContent = "Approve สำเร็จ ✅";
    $("msgBuy").className = "status ok";
    await refreshBalances();

  }catch(err){
    console.error(err);
    $("msgBuy").textContent = "Approve ไม่สำเร็จ: " + (err?.message || err);
    $("msgBuy").className = "status bad";
  }finally{
    $("btnApprove").disabled = false;
  }
}

async function buyAndAutoStake(){
  if (!account) return;

  $("btnBuy").disabled = true;
  try{
    const poolId = Number($("poolId").value || 1);
    const packageId = Number($("packageId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const signer = await bp.getSigner();
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, signer);

    $("msgBuy").textContent = "กำลังทำรายการ Buy & Auto-Stake...";
    $("msgBuy").className = "status warn";

    const tx = await c.buyPackage(poolId, packageId);
    await tx.wait();

    $("msgBuy").textContent = "Buy & Auto-Stake success ✅";
    $("msgBuy").className = "status ok";

    await refreshBalances();
    await refreshStakes();

  }catch(err){
    console.error(err);
    $("msgBuy").textContent = "Buy ไม่สำเร็จ: " + (err?.message || err);
    $("msgBuy").className = "status bad";
  }finally{
    $("btnBuy").disabled = false;
  }
}

async function refreshStakes(){
  if (!account) return;

  $("btnRefreshStakes").disabled = true;
  try{
    const poolId = Number($("poolId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, bp);

    const count = await c.getStakeCount(poolId, account);
    const n = Number(count);

    $("stakeCount").textContent = String(n);

    const body = $("stakesBody");
    body.innerHTML = "";

    const stakes = [];
    for (let i=0;i<n;i++){
      const st = await c.getStake(poolId, account, i);
      // (principal, reward, startTime, lockSec, claimed)
      stakes.push({
        index: i,
        principal: st[0],
        reward: st[1],
        startTime: Number(st[2]),
        lockSec: Number(st[3]),
        claimed: Boolean(st[4]),
      });
    }

    // render
    for (const s of stakes){
      const end = s.startTime + s.lockSec;
      const can = await c.canClaim(poolId, account, s.index).catch(()=>false);

      const tr = document.createElement("div");
      tr.className = "tr";

      tr.innerHTML = `
        <div>${s.index}</div>
        <div>${fmtNum(toUnitsFloat(s.principal, outDecimals), 6)}</div>
        <div>${fmtNum(toUnitsFloat(s.reward, outDecimals), 6)}</div>
        <div class="small">${s.startTime ? unixToLocal(s.startTime) : "-"}</div>
        <div class="small">${s.startTime ? unixToLocal(end) : "-"}</div>
        <div class="small" data-end="${end}">-</div>
        <div>
          <button class="btn ${can ? "primary" : ""}" data-claim="${s.index}" ${can ? "" : "disabled"}>
            ${s.claimed ? "Claimed" : (can ? "Claim" : "Waiting")}
          </button>
        </div>
      `;
      body.appendChild(tr);
    }

    // bind claim buttons
    body.querySelectorAll("button[data-claim]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const idx = Number(btn.getAttribute("data-claim"));
        await claimStake(idx);
      });
    });

    // start countdown
    startCountdown();

  }catch(err){
    console.error(err);
    setStatus("Refresh stakes ไม่สำเร็จ: " + (err?.message || err), "bad");
  }finally{
    $("btnRefreshStakes").disabled = false;
  }
}

function startCountdown(){
  if (countdownTimer) clearInterval(countdownTimer);

  const tick = () => {
    document.querySelectorAll("[data-end]").forEach(el=>{
      const end = Number(el.getAttribute("data-end"));
      if (!end || end <= 0){ el.textContent = "-"; return; }
      const left = end - nowSec();
      if (left <= 0){
        el.textContent = "Ready ✅";
      }else{
        el.textContent = secToHuman(left);
      }
    });
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function claimStake(stakeIndex){
  if (!account) return;

  try{
    const poolId = Number($("poolId").value || 1);

    const bp = new ethers.BrowserProvider(provider);
    const signer = await bp.getSigner();
    const c = new ethers.Contract(CONFIG.CONTRACT, CONTRACT_ABI, signer);

    setStatus(`กำลัง Claim stake #${stakeIndex}...`, "warn");
    const tx = await c.claim(poolId, stakeIndex);
    await tx.wait();

    setStatus(`Claim สำเร็จ ✅`, "ok");
    await refreshBalances();
    await refreshStakes();

  }catch(err){
    console.error(err);
    setStatus("Claim ไม่สำเร็จ: " + (err?.message || err), "bad");
  }
}

// ========= UI bind =========
window.addEventListener("DOMContentLoaded", () => {
  $("contract").textContent = CONFIG.CONTRACT;

  $("btnConnect").addEventListener("click", connectWallet);
  $("btnRefresh").addEventListener("click", refreshBalances);
  $("btnLoadPool").addEventListener("click", loadPool);
  $("btnLoadPkg").addEventListener("click", loadPackage);
  $("btnApprove").addEventListener("click", approveTHBC);
  $("btnBuy").addEventListener("click", buyAndAutoStake);
  $("btnRefreshStakes").addEventListener("click", refreshStakes);

  // default values
  $("poolId").value = String(CONFIG.DEFAULT_POOL_ID);
  $("packageId").value = String(CONFIG.DEFAULT_PACKAGE_ID);

  setStatus("Not connected", "muted");
});

/* ===== NOTE สำคัญ =====
   โค้ดนี้ใช้ ethers v6 แบบ BrowserProvider
   บน GitHub Pages ให้โหลด ethers ผ่าน CDN ได้ 2 วิธี:
   1) แทรกใน index.html ก่อน app.js เช่น:
      <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
      แล้วค่อย <script defer src="./app.js"></script>

   เพื่อให้ชัวร์ คุณเพิ่มบรรทัด CDN นี้ใน <head> เหนือ app.js ได้เลย
*/
