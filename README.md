# **Moveflow Airdrop: 项目方操作指南**

## 1. 简介

欢迎使用 Moveflow Airdrop！本指南将引导您完成作为项目方（Project Owner）所需了解的全部流程，从准备您的空投名单到管理已上线的空投项目，并提供与智能合约交互的代码示例。

## 2. 空投创建流程

创建一次成功的空投活动需要以下几个步骤。请仔细遵循。

### **第 1 步：了解并确认费用模式**

在发起空投之前，最重要的一步是与 Moveflow 平台方沟通，确定您本次空投所使用的代币将采用哪种手续费模式。平台的手续费由领取空投的用户承担，这直接影响用户的领取体验。

Moveflow 支持以下三种收费模式，您的空投代币将被配置为其中一种：

1.  **固定 ETH 费用 (Fixed ETH Fee)**

    - **工作方式:** 每个领取空投的用户都需要支付一笔固定数额的 ETH 作为手续费。
    - **对应合约:** `FixedETHFeeInstance.sol`

2.  **固定代币费用 (Fixed Token Fee)**

    - **工作方式:** 每个领取空投的用户都需要支付一笔固定数额的、**指定种类**的 ERC20 代币作为手续费。
    - **对应合约:** `FixedTokenFeeInstance.sol`

3.  **百分比费用 (Percentage Fee)**
    - **工作方式:** 手续费将从用户领取的空投代币中按预设比例自动扣除。用户无需支付额外的代币。
    - **对应合约:** `PercentageFeeInstance.sol`

**请务必在开始后续步骤前，与平台方确认您的空投代币已被正确配置了费用模式，并已加入平台白名单。**

### **第 2 步：准备您的空投名单 (CSV 文件)**

您需要一个包含接收者地址和对应数量的 CSV 文件。

```csv
0xAbcE123...,1000
0xDefG456...,550
```

### **第 3 步：生成 Merkle 根和总金额**

平台会根据您的 CSV 文件生成 **Merkle 根 (Merkle Root)** 和 **总金额 (Total Amount)**。

### **第 4 步：确认空投参数**

- **空投名称 (Name)**
- **空投代币 (Token)**
- **开始时间 (Start Time)**
- **是否支持取消 (Is Can Cancel)**

### **第 5 步：在链上创建并注资空投**

您需要调用 `MoveflowAirdropFactory` 合约的 `createProject` 函数来正式发起空投。这是一个原子操作，会同时部署新合约并转入资金。

## 3. 空投项目权限管理

项目创建后，您作为项目所有者（Owner），可对**该项目的独立合约**（Proxy Address）拥有以下管理权限。

**重要:** 您需要获取您项目的 `proxyAddress`（可从 `ProjectCreated` 事件日志中获得）以及 `MoveflowAirdropImpl` 合约的 ABI 来与您的项目进行交互。

### **取消整个空投 (`cancelAirdrop`)**

- **功能:** 完全取消尚未开始的空投活动。合约中剩余的**全部**资金将被退还到您的钱包。
- **权限:**
  - 必须在创建项目时将 `isCanCancel` 设置为 `true`。
  - 必须在 `startTime` **之前**调用。活动一旦开始，此功能便无法使用。

### **拉黑单个用户 (`addToBlacklist`)**

- **功能:** 阻止名单上的某个特定用户领取他们的空投份额。
- **权限:**
  - 必须在创建项目时将 `isCanCancel` 设置为 `true`。
  - 可以随时（开始前后）对尚未领取的地址执行。
  - 您也可以使用 `removeFromBlacklist` 将用户移出黑名单，恢复其领取资格。

### **回滚资金 (`rollbackAirdrop`)**

- **功能:** 在空投活动开始后，提前结束活动并撤回剩余资金。
- **权限:**
  - 必须在 `startTime` **之后**调用。
  - **注意:** 执行此操作会产生一笔平台服务费（回滚费），该费用会从剩余资金中扣除，然后将最终余额退还给您。

## 4. 合约接口调用示例

以下示例展示了如何使用 JavaScript (`ethers.js`) 和 Python (`web3.py`) 与合约交互。

### **4.1 创建空投 (`createProject`)**

#### **JavaScript (`ethers.js`) 示例**

```javascript
import { ethers } from "ethers";

// --- 1. 配置环境 ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const privateKey = "YOUR_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey, provider);

const factoryAddress = "MOVEFLOW_AIRDROP_FACTORY_ADDRESS";
const factoryAbi = [
  /*... MoveflowAirdropFactory ABI ...*/
];
const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);

const tokenAddress = "YOUR_ERC20_TOKEN_ADDRESS"; // 如果是ETH空投，则为 ethers.ZeroAddress
const tokenAbi = [
  "function approve(address spender, uint256 amount) returns (bool)",
];
const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);

// --- 2. 设置空投参数 ---
const airdropName = "My Awesome Airdrop";
const totalAirdropAmount = ethers.parseUnits("10000", 18); // 假设18位小数
const merkleRoot = "0x..."; // 从第3步获取
const startTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后开始
const isCanCancel = true;

async function createAirdrop() {
  try {
    // --- 3. 对于ERC20代币，先授权 ---
    if (tokenAddress !== ethers.ZeroAddress) {
      console.log("Approving token transfer...");
      const approveTx = await tokenContract.approve(
        factoryAddress,
        totalAirdropAmount
      );
      await approveTx.wait();
      console.log("Approval successful!");
    }

    // --- 4. 调用 createProject ---
    console.log("Creating airdrop project...");
    // 如果是ETH空投，需要通过 value 字段发送ETH
    const txOptions = {
      value: tokenAddress === ethers.ZeroAddress ? totalAirdropAmount : 0,
    };

    const createTx = await factoryContract.createProject(
      airdropName,
      tokenAddress,
      totalAirdropAmount,
      merkleRoot,
      startTime,
      isCanCancel,
      txOptions
    );

    const receipt = await createTx.wait();
    console.log(
      "Airdrop created successfully! Transaction hash:",
      receipt.transactionHash
    );
    // 你可以从 receipt.logs 中解析 ProjectCreated 事件来获取 proxyAddress
  } catch (error) {
    console.error("Failed to create airdrop:", error);
  }
}

createAirdrop();
```

#### **Python (`web3.py`) 示例**

```python
from web3 import Web3
import time

# --- 1. 配置环境 ---
w3 = Web3(Web3.HTTPProvider("YOUR_RPC_URL"))
account = w3.eth.account.from_key("YOUR_PRIVATE_KEY")
w3.eth.default_account = account.address

factory_address = "MOVEFLOW_AIRDROP_FACTORY_ADDRESS"
factory_abi = [ # ... MoveflowAirdropFactory ABI ... # ]
factory_contract = w3.eth.contract(address=factory_address, abi=factory_abi)

token_address = "YOUR_ERC20_TOKEN_ADDRESS" # 如果是ETH空投，则为 "0x0000000000000000000000000000000000000000"
token_abi = '''[{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"}]'''
token_contract = w3.eth.contract(address=token_address, abi=token_abi)

# --- 2. 设置空投参数 ---
airdrop_name = "My Awesome Airdrop"
total_airdrop_amount = w3.to_wei(10000, "ether") # 假设18位小数
merkle_root = "0x..." # 从第3步获取
start_time = int(time.time()) + 3600 # 1小时后开始
is_can_cancel = True

def create_airdrop():
    try:
        # --- 3. 对于ERC20代币，先授权 ---
        if token_address != "0x0000000000000000000000000000000000000000":
            print("Approving token transfer...")
            approve_tx = token_contract.functions.approve(factory_address, total_airdrop_amount).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            signed_approve_tx = w3.eth.account.sign_transaction(approve_tx, private_key=account.key)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve_tx.rawTransaction)
            w3.eth.wait_for_transaction_receipt(approve_tx_hash)
            print(f"Approval successful! Tx: {approve_tx_hash.hex()}")

        # --- 4. 调用 createProject ---
        print("Creating airdrop project...")
        # 如果是ETH空投，需要通过 value 字段发送ETH
        tx_params = {
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'value': total_airdrop_amount if token_address == "0x0000000000000000000000000000000000000000" else 0
        }
        create_tx = factory_contract.functions.createProject(
            airdrop_name,
            token_address,
            total_airdrop_amount,
            merkle_root,
            start_time,
            is_can_cancel
        ).build_transaction(tx_params)

        signed_create_tx = w3.eth.account.sign_transaction(create_tx, private_key=account.key)
        create_tx_hash = w3.eth.send_raw_transaction(signed_create_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(create_tx_hash)
        print(f"Airdrop created successfully! Tx: {receipt.transactionHash.hex()}")

    except Exception as e:
        print(f"Failed to create airdrop: {e}")

create_airdrop()
```

### **4.2 权限接口调用**

#### **JavaScript (`ethers.js`) 示例**

```javascript
// --- 配置 ---
const implAbi = [
  /*... MoveflowAirdropImpl ABI ...*/
];
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const projectContract = new ethers.Contract(
  projectProxyAddress,
  implAbi,
  wallet
);

// --- 调用示例 ---
async function manageAirdrop() {
  // 取消空投 (活动开始前)
  // const tx = await projectContract.cancelAirdrop();

  // 回滚资金 (活动开始后)
  // const tx = await projectContract.rollbackAirdrop();

  // 拉黑用户
  const userToBlacklist = "0x...";
  const tx = await projectContract.addToBlacklist(userToBlacklist);

  await tx.wait();
  console.log("Management action successful!");
}
```

#### **Python (`web3.py`) 示例**

```python
# --- 配置 ---
impl_abi = [ # ... MoveflowAirdropImpl ABI ... # ]
project_proxy_address = "YOUR_PROJECT_PROXY_ADDRESS"
project_contract = w3.eth.contract(address=project_proxy_address, abi=impl_abi)

# --- 调用示例 ---
def manage_airdrop():
    tx_params = {'from': account.address, 'nonce': w3.eth.get_transaction_count(account.address)}

    # 取消空投 (活动开始前)
    # tx = project_contract.functions.cancelAirdrop().build_transaction(tx_params)

    # 回滚资金 (活动开始后)
    # tx = project_contract.functions.rollbackAirdrop().build_transaction(tx_params)

    # 拉黑用户
    user_to_blacklist = "0x..."
    tx = project_contract.functions.addToBlacklist(user_to_blacklist).build_transaction(tx_params)

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=account.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Management action successful! Tx: {tx_hash.hex()}")
```
