# 📁 EXACT FILES TO COPY TO CODESPACES

## 🔥 **CRITICAL FILES (MUST COPY)**

### **1. Smart Contract** ⚠️ **MOST IMPORTANT**
```
📂 programs/coin-flipper/src/lib.rs
```
**Contains:** Auto-resolution system, updated fees, security fixes

### **2. Frontend Config** ⚠️ **IMPORTANT**
```
📂 src/config/constants.ts
```
**Contains:** Updated resolution fee constant (0.001 SOL)

### **3. Frontend Component** ⚠️ **IMPORTANT**
```
📂 src/components/BlockchainGame.tsx
```
**Contains:** Removed manual resolve, updated cost calculations

## 📄 **DOCUMENTATION FILES (OPTIONAL)**
```
📂 AUTO_RESOLUTION_UPGRADE_GUIDE.md          (NEW)
📂 CHANGED_FILES_SUMMARY.md                  (NEW)
📂 CODESPACES_DEPLOYMENT_GUIDE.md            (NEW)
📂 CORRECTED_ECONOMIC_ANALYSIS.md            (NEW)
📂 FINAL_SC_VERIFICATION.md                  (NEW)
📂 SC_SECURITY_ANALYSIS.md                   (NEW)
```

## 🚀 **FASTEST DEPLOYMENT METHOD**

### **Option 1: Git Push (RECOMMENDED)**
```powershell
# From Windows (F:\flipCoin)
git add .
git commit -m "feat: implement auto-resolution system"
git push origin main

# Then open Codespaces - files will be there automatically
```

### **Option 2: Manual File Copy**
If you can't use Git, copy these 3 files manually to Codespaces:

1. **Copy content from:** `F:\flipCoin\programs\coin-flipper\src\lib.rs`
   **Paste to:** `/workspaces/flipCoin/programs/coin-flipper/src/lib.rs`

2. **Copy content from:** `F:\flipCoin\src\config\constants.ts`
   **Paste to:** `/workspaces/flipCoin/src/config/constants.ts`

3. **Copy content from:** `F:\flipCoin\src\components\BlockchainGame.tsx`
   **Paste to:** `/workspaces/flipCoin/src/components/BlockchainGame.tsx`

## ✅ **VERIFICATION COMMANDS**

After copying files to Codespaces, run these to verify:

```bash
# Check smart contract has correct fee
grep "RESOLUTION_FEE_PER_PLAYER.*1_000_000" programs/coin-flipper/src/lib.rs

# Check frontend has correct fee
grep "RESOLUTION_FEE_PER_PLAYER = 0.001" src/config/constants.ts

# Check auto-resolve function exists
grep -A 5 "fn auto_resolve_game" programs/coin-flipper/src/lib.rs
```

## 🎯 **DEPLOYMENT COMMANDS**

Once files are copied, run these in Codespaces:

```bash
# 1. Build contract
anchor build

# 2. Deploy contract
anchor deploy --provider.cluster devnet

# 3. Install frontend deps
npm install

# 4. Initialize program
npm run deploy:init

# 5. Start frontend
npm start
```

---

**⚡ That's it! Just copy those 3 files and run the deployment commands.**
