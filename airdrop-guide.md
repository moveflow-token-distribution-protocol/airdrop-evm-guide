# **Moveflow Airdrop: 项目方操作指南**

## 1. 简介

欢迎使用 Moveflow Airdrop。本指南将引导您完成作为项目方（Project Owner）所需了解的全部流程，从准备您的空投名单到管理已上线的空投项目，并提供与智能合约交互的代码示例。

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

#### **必要的 ABI 定义**

```javascript
// MoveflowAirdropFactory - createProject 函数和事件 ABI
const factoryAbi = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "totalAmount", type: "uint256" },
      { internalType: "bytes32", name: "merkleRoot", type: "bytes32" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "bool", name: "isCanCancel", type: "bool" },
    ],
    name: "createProject",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "proxyAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isCanCancel",
        type: "bool",
      },
    ],
    name: "ProjectCreated",
    type: "event",
  },
];

// ERC20 Token - approve 函数 ABI
const tokenAbi = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    type: "function",
  },
];
```

#### **JavaScript (ethers.js v6) 示例**

```javascript
import { ethers } from "ethers";

// --- 1. 配置环境 ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const privateKey = "YOUR_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey, provider);

const factoryAddress = "MOVEFLOW_AIRDROP_FACTORY_ADDRESS";
const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);

const tokenAddress = "YOUR_ERC20_TOKEN_ADDRESS"; // 如果是ETH空投，则为 ethers.ZeroAddress
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
      receipt.hash
    );

    // --- 5. 从事件中获取 proxy address ---
    // 解析 ProjectCreated 事件
    const projectCreatedEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        ethers.id("ProjectCreated(uint256,address,address,uint256,bool)")
    );

    if (projectCreatedEvent) {
      // 解码事件数据
      const decodedEvent = factoryContract.interface.parseLog({
        topics: projectCreatedEvent.topics,
        data: projectCreatedEvent.data,
      });

      const projectId = decodedEvent.args.projectId;
      const proxyAddress = decodedEvent.args.proxyAddress;

      console.log("Project ID:", projectId.toString());
      console.log("Proxy Address:", proxyAddress);
      console.log("You can now interact with your airdrop at:", proxyAddress);

      return { projectId, proxyAddress };
    }
  } catch (error) {
    console.error("Failed to create airdrop:", error);
  }
}

createAirdrop();
```

#### **Python (web3.py v7) 示例**

```python
from web3 import Web3
from eth_account import Account
import time

# --- 1. 配置环境 ---
w3 = Web3(Web3.HTTPProvider("YOUR_RPC_URL"))
account = Account.from_key("YOUR_PRIVATE_KEY")

factory_address = Web3.to_checksum_address("MOVEFLOW_AIRDROP_FACTORY_ADDRESS")
factory_abi = [
    {
        "inputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "address", "name": "token", "type": "address"},
            {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
            {"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"},
            {"internalType": "uint256", "name": "startTime", "type": "uint256"},
            {"internalType": "bool", "name": "isCanCancel", "type": "bool"}
        ],
        "name": "createProject",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "projectId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "proxyAddress", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "token", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "totalAmount", "type": "uint256"},
            {"indexed": False, "internalType": "bool", "name": "isCanCancel", "type": "bool"}
        ],
        "name": "ProjectCreated",
        "type": "event"
    }
]
factory_contract = w3.eth.contract(address=factory_address, abi=factory_abi)

token_address = Web3.to_checksum_address("YOUR_ERC20_TOKEN_ADDRESS") # 如果是ETH空投，则为 "0x0000000000000000000000000000000000000000"
token_abi = [
    {
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]
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
            signed_approve_tx = account.sign_transaction(approve_tx)
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

        signed_create_tx = account.sign_transaction(create_tx)
        create_tx_hash = w3.eth.send_raw_transaction(signed_create_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(create_tx_hash)
        print(f"Airdrop created successfully! Tx: {receipt.transactionHash.hex()}")

        # --- 5. 从事件中获取 proxy address ---
        # 获取 ProjectCreated 事件
        project_created_events = factory_contract.events.ProjectCreated().process_receipt(receipt)

        if project_created_events:
            event = project_created_events[0]
            project_id = event['args']['projectId']
            proxy_address = event['args']['proxyAddress']

            print(f"Project ID: {project_id}")
            print(f"Proxy Address: {proxy_address}")
            print(f"You can now interact with your airdrop at: {proxy_address}")

            return {"projectId": project_id, "proxyAddress": proxy_address}

    except Exception as e:
        print(f"Failed to create airdrop: {e}")

create_airdrop()
```

### **4.2 权限接口调用**

#### **管理功能 ABI 定义**

```javascript
// MoveflowAirdropImpl - 管理功能 ABI
const implAbi = [
  {
    inputs: [],
    name: "cancelAirdrop",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "rollbackAirdrop",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "addToBlacklist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "removeFromBlacklist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
```

#### **JavaScript (ethers.js v6) 示例**

```javascript
// --- 配置 ---
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

#### **Python (web3.py v7) 示例**

```python
# --- 配置 ---
impl_abi = [
    {
        "inputs": [],
        "name": "cancelAirdrop",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "rollbackAirdrop",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "addToBlacklist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "removeFromBlacklist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]
project_proxy_address = Web3.to_checksum_address("YOUR_PROJECT_PROXY_ADDRESS")
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

    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Management action successful! Tx: {tx_hash.hex()}")
```

## 5. 用户领取空投接口

用户需要调用 `MoveflowAirdropImpl` 合约的 `claim` 函数来领取空投。领取前，用户需要：

1. 获取自己的 Merkle 证明（通常由前端或 API 提供）
2. 了解费用信息（调用 `getFeeInfo` 查询）
3. 准备相应的费用支付方式

### **5.1 查询费用信息 (`getFeeInfo`)**

在领取空投前，用户应该先查询费用信息，了解需要支付的费用类型和金额。

#### **JavaScript (ethers.js v6) 示例**

```javascript
async function queryFeeInfo(projectProxyAddress, claimAmount) {
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");

  const getFeeInfoAbi = [
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "getFeeInfo",
      outputs: [
        { internalType: "uint256", name: "feeAmount", type: "uint256" },
        { internalType: "address", name: "feeToken", type: "address" },
        { internalType: "uint8", name: "feeType", type: "uint8" },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  const projectContract = new ethers.Contract(
    projectProxyAddress,
    getFeeInfoAbi,
    provider
  );

  try {
    const feeInfo = await projectContract.getFeeInfo(claimAmount);
    const feeAmount = feeInfo[0];
    const feeToken = feeInfo[1];
    const feeType = feeInfo[2];

    console.log("=== Fee Information ===");
    console.log(`Fee Amount: ${ethers.formatUnits(feeAmount, 18)}`);
    console.log(`Fee Token Address: ${feeToken}`);

    if (feeType === 0n) {
      console.log("Fee Type: Fixed ETH Fee");
      console.log(
        `You need to send ${ethers.formatEther(feeAmount)} ETH as fee`
      );
    } else if (feeType === 1n) {
      console.log("Fee Type: Fixed Token Fee");
      console.log(
        `You need to approve and pay ${ethers.formatUnits(
          feeAmount,
          18
        )} tokens at address ${feeToken}`
      );
    } else if (feeType === 2n) {
      console.log("Fee Type: Percentage Fee");
      console.log(
        `${ethers.formatUnits(
          feeAmount,
          18
        )} tokens will be deducted from your claim amount`
      );
    }

    return { feeAmount, feeToken, feeType };
  } catch (error) {
    console.error("Failed to query fee info:", error);
  }
}

// 使用示例
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const claimAmount = ethers.parseUnits("100", 18);
queryFeeInfo(projectProxyAddress, claimAmount);
```

#### **Python (web3.py v7) 示例**

```python
def query_fee_info(project_proxy_address, claim_amount):
    w3 = Web3(Web3.HTTPProvider("YOUR_RPC_URL"))

    get_fee_info_abi = [
        {
            "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
            "name": "getFeeInfo",
            "outputs": [
                {"internalType": "uint256", "name": "feeAmount", "type": "uint256"},
                {"internalType": "address", "name": "feeToken", "type": "address"},
                {"internalType": "uint8", "name": "feeType", "type": "uint8"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    project_contract = w3.eth.contract(
        address=Web3.to_checksum_address(project_proxy_address),
        abi=get_fee_info_abi
    )

    try:
        fee_info = project_contract.functions.getFeeInfo(claim_amount).call()
        fee_amount = fee_info[0]
        fee_token = fee_info[1]
        fee_type = fee_info[2]

        print("=== Fee Information ===")
        print(f"Fee Amount: {w3.from_wei(fee_amount, 'ether')}")
        print(f"Fee Token Address: {fee_token}")

        if fee_type == 0:
            print("Fee Type: Fixed ETH Fee")
            print(f"You need to send {w3.from_wei(fee_amount, 'ether')} ETH as fee")
        elif fee_type == 1:
            print("Fee Type: Fixed Token Fee")
            print(f"You need to approve and pay {w3.from_wei(fee_amount, 'ether')} tokens at address {fee_token}")
        elif fee_type == 2:
            print("Fee Type: Percentage Fee")
            print(f"{w3.from_wei(fee_amount, 'ether')} tokens will be deducted from your claim amount")

        return {"feeAmount": fee_amount, "feeToken": fee_token, "feeType": fee_type}

    except Exception as e:
        print(f"Failed to query fee info: {e}")

# 使用示例
project_proxy_address = "YOUR_PROJECT_PROXY_ADDRESS"
claim_amount = w3.to_wei(100, "ether")
query_fee_info(project_proxy_address, claim_amount)
```

### **5.2 用户领取空投 (`claim`)**

#### **JavaScript (ethers.js v6) 示例**

```javascript
import { ethers } from "ethers";

// --- 配置环境 ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const privateKey = "USER_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey, provider);

const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const implAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes32[]", name: "merkleProof", type: "bytes32[]" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "getFeeInfo",
    outputs: [
      { internalType: "uint256", name: "feeAmount", type: "uint256" },
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "uint8", name: "feeType", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
];
const projectContract = new ethers.Contract(
  projectProxyAddress,
  implAbi,
  wallet
);

async function claimAirdrop() {
  try {
    // --- 1. 获取用户的领取信息 ---
    const claimAmount = ethers.parseUnits("100", 18); // 用户可领取的数量
    const merkleProof = [
      "0x...", // Merkle proof 由后端提供
      "0x...",
      "0x...",
    ];

    // --- 2. 查询费用信息 ---
    const feeInfo = await projectContract.getFeeInfo(claimAmount);
    const feeAmount = feeInfo[0];
    const feeToken = feeInfo[1];
    const feeType = feeInfo[2]; // 0: FIXED_ETH, 1: FIXED_TOKEN, 2: PERCENTAGE

    console.log(`Fee amount: ${ethers.formatUnits(feeAmount, 18)}`);
    console.log(`Fee type: ${feeType}`);

    // --- 3. 根据费用类型准备支付 ---
    let txOptions = {};

    if (feeType === 0n) {
      // FIXED_ETH_FEE
      // 需要发送ETH作为手续费
      txOptions.value = feeAmount;
      console.log(`Sending ${ethers.formatEther(feeAmount)} ETH as fee`);
    } else if (feeType === 1n) {
      // FIXED_TOKEN_FEE
      // 需要先授权费用代币
      const feeTokenAbi = [
        "function approve(address spender, uint256 amount) returns (bool)",
      ];
      const feeTokenContract = new ethers.Contract(
        feeToken,
        feeTokenAbi,
        wallet
      );

      console.log("Approving fee token...");
      const approveTx = await feeTokenContract.approve(
        projectProxyAddress,
        feeAmount
      );
      await approveTx.wait();
      console.log("Fee token approved!");
    } else if (feeType === 2n) {
      // PERCENTAGE_FEE
      // 百分比费用从领取金额中扣除，无需额外操作
      console.log(
        `Fee will be deducted from claim amount: ${ethers.formatUnits(
          feeAmount,
          18
        )}`
      );
    }

    // --- 4. 调用 claim 函数 ---
    console.log("Claiming airdrop...");
    const claimTx = await projectContract.claim(
      claimAmount,
      merkleProof,
      txOptions
    );
    const receipt = await claimTx.wait();

    console.log("Airdrop claimed successfully!");
    console.log(`Transaction hash: ${receipt.hash}`);

    // 如果是百分比费用，实际收到的金额
    if (feeType === 2n) {
      const actualReceived = claimAmount - feeAmount;
      console.log(
        `Actual amount received: ${ethers.formatUnits(actualReceived, 18)}`
      );
    }
  } catch (error) {
    console.error("Failed to claim airdrop:", error);
  }
}

claimAirdrop();
```

#### **Python (web3.py v7) 示例**

```python
from web3 import Web3
from eth_account import Account

# --- 配置环境 ---
w3 = Web3(Web3.HTTPProvider("YOUR_RPC_URL"))
account = Account.from_key("USER_PRIVATE_KEY")

project_proxy_address = Web3.to_checksum_address("YOUR_PROJECT_PROXY_ADDRESS")
impl_abi = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"}
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "getFeeInfo",
        "outputs": [
            {"internalType": "uint256", "name": "feeAmount", "type": "uint256"},
            {"internalType": "address", "name": "feeToken", "type": "address"},
            {"internalType": "uint8", "name": "feeType", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]
project_contract = w3.eth.contract(address=project_proxy_address, abi=impl_abi)

def claim_airdrop():
    try:
        # --- 1. 获取用户的领取信息 ---
        claim_amount = w3.to_wei(100, "ether")  # 用户可领取的数量
        merkle_proof = [
            bytes.fromhex("..."),  # Merkle proof 由后端提供，去掉 0x 前缀
            bytes.fromhex("..."),
            bytes.fromhex("...")
        ]

        # --- 2. 查询费用信息 ---
        fee_info = project_contract.functions.getFeeInfo(claim_amount).call()
        fee_amount = fee_info[0]
        fee_token = fee_info[1]
        fee_type = fee_info[2]  # 0: FIXED_ETH, 1: FIXED_TOKEN, 2: PERCENTAGE

        print(f"Fee amount: {w3.from_wei(fee_amount, 'ether')}")
        print(f"Fee type: {fee_type}")

        # --- 3. 根据费用类型准备支付 ---
        tx_params = {
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 300000,  # 估算或设置合理的 gas limit
            'gasPrice': w3.eth.gas_price
        }

        if fee_type == 0:  # FIXED_ETH_FEE
            # 需要发送ETH作为手续费
            tx_params['value'] = fee_amount
            print(f"Sending {w3.from_wei(fee_amount, 'ether')} ETH as fee")

        elif fee_type == 1:  # FIXED_TOKEN_FEE
            # 需要先授权费用代币
            fee_token_abi = [
                {
                    "inputs": [
                        {"name": "spender", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                    ],
                    "name": "approve",
                    "outputs": [{"name": "", "type": "bool"}],
                    "type": "function"
                }
            ]
            fee_token_contract = w3.eth.contract(address=fee_token, abi=fee_token_abi)

            print("Approving fee token...")
            approve_tx = fee_token_contract.functions.approve(
                project_proxy_address,
                fee_amount
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': w3.eth.gas_price
            })

            signed_approve = account.sign_transaction(approve_tx)
            approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            w3.eth.wait_for_transaction_receipt(approve_hash)
            print("Fee token approved!")

            # 更新 nonce
            tx_params['nonce'] = w3.eth.get_transaction_count(account.address)

        elif fee_type == 2:  # PERCENTAGE_FEE
            # 百分比费用从领取金额中扣除，无需额外操作
            print(f"Fee will be deducted from claim amount: {w3.from_wei(fee_amount, 'ether')}")

        # --- 4. 调用 claim 函数 ---
        print("Claiming airdrop...")
        claim_tx = project_contract.functions.claim(
            claim_amount,
            merkle_proof
        ).build_transaction(tx_params)

        signed_tx = account.sign_transaction(claim_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        print("Airdrop claimed successfully!")
        print(f"Transaction hash: {tx_hash.hex()}")

        # 如果是百分比费用，实际收到的金额
        if fee_type == 2:
            actual_received = claim_amount - fee_amount
            print(f"Actual amount received: {w3.from_wei(actual_received, 'ether')}")

    except Exception as e:
        print(f"Failed to claim airdrop: {e}")

claim_airdrop()
```

## 6. 查询接口示例

`MoveflowAirdropImpl` 合约提供了多个查询接口，用户和项目方可以通过这些接口查询空投的状态和信息。

### **6.1 查询接口 ABI**

```javascript
const queryAbi = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasClaimed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isBlacklisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimed",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedUserCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "merkleRoot",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes32[]", name: "merkleProof", type: "bytes32[]" },
    ],
    name: "verifyProof",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isCancelled",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
```

### **6.2 JavaScript (ethers.js v6) 查询示例**

```javascript
import { ethers } from "ethers";

// --- 配置环境 ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const projectContract = new ethers.Contract(
  projectProxyAddress,
  queryAbi,
  provider
);

async function queryAirdropInfo() {
  try {
    const userAddress = "0x1234567890123456789012345678901234567890";
    const claimAmount = ethers.parseUnits("100", 18);
    const merkleProof = ["0x...", "0x...", "0x..."];

    // 1. 查询用户是否已领取
    const claimed = await projectContract.hasClaimed(userAddress);
    console.log(`User has claimed: ${claimed}`);

    // 2. 查询用户是否被拉黑
    const blacklisted = await projectContract.isBlacklisted(userAddress);
    console.log(`User is blacklisted: ${blacklisted}`);

    // 3. 查询总领取金额
    const totalClaimedAmount = await projectContract.totalClaimed();
    console.log(
      `Total claimed amount: ${ethers.formatUnits(totalClaimedAmount, 18)}`
    );

    // 4. 查询总领取用户数
    const claimedUserCount = await projectContract.totalClaimedUserCount();
    console.log(`Total users claimed: ${claimedUserCount}`);

    // 5. 查询 Merkle 根
    const root = await projectContract.merkleRoot();
    console.log(`Merkle root: ${root}`);

    // 6. 验证 Merkle 证明
    const isValid = await projectContract.verifyProof(
      userAddress,
      claimAmount,
      merkleProof
    );
    console.log(`Proof is valid: ${isValid}`);

    // 7. 查询空投是否已取消
    const cancelled = await projectContract.isCancelled();
    console.log(`Airdrop is cancelled: ${cancelled}`);

    // 8. 查询空投开始时间
    const start = await projectContract.startTime();
    const startDate = new Date(Number(start) * 1000);
    console.log(`Start time: ${startDate.toISOString()}`);

    // 综合状态检查
    const currentTime = Math.floor(Date.now() / 1000);
    if (cancelled) {
      console.log("Status: Airdrop has been cancelled");
    } else if (currentTime < Number(start)) {
      console.log("Status: Airdrop not started yet");
    } else if (claimed) {
      console.log("Status: User has already claimed");
    } else if (blacklisted) {
      console.log("Status: User is blacklisted");
    } else if (!isValid) {
      console.log("Status: Invalid proof or not eligible");
    } else {
      console.log("Status: User can claim");
    }
  } catch (error) {
    console.error("Query failed:", error);
  }
}

queryAirdropInfo();
```

### **6.3 Python (web3.py v7) 查询示例**

```python
from web3 import Web3
from datetime import datetime

# --- 配置环境 ---
w3 = Web3(Web3.HTTPProvider("YOUR_RPC_URL"))
project_proxy_address = Web3.to_checksum_address("YOUR_PROJECT_PROXY_ADDRESS")

query_abi = [
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "hasClaimed",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "isBlacklisted",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalClaimed",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalClaimedUserCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "merkleRoot",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"}
        ],
        "name": "verifyProof",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "isCancelled",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

project_contract = w3.eth.contract(address=project_proxy_address, abi=query_abi)

def query_airdrop_info():
    try:
        user_address = Web3.to_checksum_address("0x1234567890123456789012345678901234567890")
        claim_amount = w3.to_wei(100, "ether")
        merkle_proof = [
            bytes.fromhex("..."),  # 去掉 0x 前缀
            bytes.fromhex("..."),
            bytes.fromhex("...")
        ]

        # 1. 查询用户是否已领取
        claimed = project_contract.functions.hasClaimed(user_address).call()
        print(f"User has claimed: {claimed}")

        # 2. 查询用户是否被拉黑
        blacklisted = project_contract.functions.isBlacklisted(user_address).call()
        print(f"User is blacklisted: {blacklisted}")

        # 3. 查询总领取金额
        total_claimed_amount = project_contract.functions.totalClaimed().call()
        print(f"Total claimed amount: {w3.from_wei(total_claimed_amount, 'ether')} tokens")

        # 4. 查询总领取用户数
        claimed_user_count = project_contract.functions.totalClaimedUserCount().call()
        print(f"Total users claimed: {claimed_user_count}")

        # 5. 查询 Merkle 根
        root = project_contract.functions.merkleRoot().call()
        print(f"Merkle root: {root.hex()}")

        # 6. 验证 Merkle 证明
        is_valid = project_contract.functions.verifyProof(
            user_address,
            claim_amount,
            merkle_proof
        ).call()
        print(f"Proof is valid: {is_valid}")

        # 7. 查询空投是否已取消
        cancelled = project_contract.functions.isCancelled().call()
        print(f"Airdrop is cancelled: {cancelled}")

        # 8. 查询空投开始时间
        start_timestamp = project_contract.functions.startTime().call()
        start_date = datetime.fromtimestamp(start_timestamp)
        print(f"Start time: {start_date.isoformat()}")

        # 综合状态检查
        import time
        current_time = int(time.time())

        if cancelled:
            print("Status: Airdrop has been cancelled")
        elif current_time < start_timestamp:
            print("Status: Airdrop not started yet")
        elif claimed:
            print("Status: User has already claimed")
        elif blacklisted:
            print("Status: User is blacklisted")
        elif not is_valid:
            print("Status: Invalid proof or not eligible")
        else:
            print("Status: User can claim")

    except Exception as e:
        print(f"Query failed: {e}")

query_airdrop_info()
```

### **6.4 批量查询示例**

对于需要查询多个用户状态的场景，可以使用批量查询优化性能：

#### **JavaScript (ethers.js v6)**

```javascript
async function batchQueryUsers(userAddresses) {
  const results = await Promise.all(
    userAddresses.map(async (address) => {
      const [hasClaimed, isBlacklisted] = await Promise.all([
        projectContract.hasClaimed(address),
        projectContract.isBlacklisted(address),
      ]);
      return {
        address,
        hasClaimed,
        isBlacklisted,
        canClaim: !hasClaimed && !isBlacklisted,
      };
    })
  );

  console.log("Batch query results:", results);
  return results;
}

// 使用示例
const users = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901",
  "0x3456789012345678901234567890123456789012",
];
batchQueryUsers(users);
```

#### **Python (web3.py v7)**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

def batch_query_users(user_addresses):
    def query_user(address):
        address = Web3.to_checksum_address(address)
        has_claimed = project_contract.functions.hasClaimed(address).call()
        is_blacklisted = project_contract.functions.isBlacklisted(address).call()
        return {
            'address': address,
            'hasClaimed': has_claimed,
            'isBlacklisted': is_blacklisted,
            'canClaim': not has_claimed and not is_blacklisted
        }

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(query_user, user_addresses))

    print("Batch query results:", results)
    return results

# 使用示例
users = [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901",
    "0x3456789012345678901234567890123456789012"
]
batch_query_users(users)
```
