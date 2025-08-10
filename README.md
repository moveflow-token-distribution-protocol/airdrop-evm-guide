# **MoveFlow Airdrop: Project Owner Operation Guide**

## 1. Introduction

Welcome to Moveflow Airdrop. This guide will walk you through all the processes you need to understand as a project owner, from preparing your airdrop list and managing launched airdrop projects to querying airdrop progress, and provides code examples for interacting with smart contracts.

## 2. Airdrop Creation

Creating a successful airdrop campaign requires several steps. Please follow carefully.

### **Step 1: Understand and Confirm Fee Model**

Before launching an airdrop, the most important step is to communicate with the Moveflow platform to determine which fee model your airdrop token will use. Platform fees are borne by users claiming the airdrop, which directly affects the user claiming experience.

Moveflow supports the following three fee models, and your airdrop token will be configured as one of them:

1.  **Fixed Gas Token Fee (Fixed Gas Token Fee)**

    - **How it works:** Each user claiming the airdrop needs to pay a fixed amount of Gas Token as a fee.
    - **Corresponding contract:** `FixedETHFeeInstance.sol`

2.  **Fixed Token Fee (Fixed Token Fee)**

    - **How it works:** Each user claiming the airdrop needs to pay a fixed amount of a **specified type** of ERC20 token as a fee.
    - **Corresponding contract:** `FixedTokenFeeInstance.sol`

3.  **Percentage Fee (Percentage Fee)**
    - **How it works:** Fees will be automatically deducted from the user's claimed airdrop tokens at a preset ratio. Users don't need to pay additional tokens.
    - **Corresponding contract:** `PercentageFeeInstance.sol`

**Please be sure to confirm with the platform that your airdrop token has been correctly configured with a fee model and added to the platform whitelist before proceeding with the following steps.**

### **Step 2: Prepare Your Airdrop List (CSV File)**

You need a CSV file containing recipient addresses and corresponding amounts.

```csv
0xAbcE123...,1000
0xDefG456...,550
```

### **Step 3: Generate Merkle Root and Total Amount**

The platform will generate a **Merkle Root** and **Total Amount** based on your CSV file.
The process of generating a Merkle Tree can be referenced from the `generateMerkleTree.ts` file in the repo.

### **Step 4: Confirm Airdrop Parameters**

- **Airdrop Name (Name)**
- **Airdrop Token (Token)**
- **Start Time (Start Time)**
- **Can Cancel (Is Can Cancel)**

### **Step 5: Create and Fund Airdrop on Chain**

You need to call the `createProject` function of the `MoveflowAirdropFactory` contract to officially launch the airdrop. This is an atomic operation that will simultaneously deploy a new contract and transfer funds.

### **Step 6: Create User Interaction Frontend Page**

To facilitate users claiming the airdrop, you need to contact the platform to create an airdrop claiming page. Reference example:  
[https://claim.mezo.moveflow.xyz/](https://claim.mezo.moveflow.xyz/)

## 3. Airdrop Management

After project creation, as the project owner, you have the following management permissions for **the independent contract of that project** (Proxy Address).

**Important:** You need to obtain your project's `proxyAddress` (available from the `ProjectCreated` event log) and the `MoveflowAirdropImpl` contract's ABI to interact with your project.

### **Cancel Entire Airdrop (`cancelAirdrop`)**

- **Function:** Completely cancel an airdrop campaign that hasn't started yet. All remaining funds in the contract will be refunded to your wallet.
- **Permissions:**
  - Must set `isCanCancel` to `true` when creating the project.
  - Must be called **before** `startTime`. Once the activity starts, this function cannot be used.

### **Blacklist Individual User (`addToBlacklist`)**

- **Function:** Prevent a specific user on the list from claiming their airdrop share.
- **Permissions:**
  - Must set `isCanCancel` to `true` when creating the project.
  - Can be executed at any time (before or after start) for addresses that haven't claimed yet.
  - You can also use `removeFromBlacklist` to remove users from the blacklist and restore their claiming eligibility.

### **Rollback Funds (`rollbackAirdrop`)**

- **Function:** End the airdrop campaign early and withdraw remaining funds after the airdrop activity has started.
- **Permissions:**
  - Must be called **after** `startTime`.
  - **Note:** Executing this operation will incur a platform service fee (rollback fee), which will be deducted from the remaining funds, and then the final balance will be refunded to you.

## 4. Airdrop Claiming

Users can claim airdrop tokens through the airdrop claiming page you provide (refer to airdrop creation: Step 6) or by directly interacting with the contract.  
The following information is required for claiming:

- **Claim Amount (amount):** The token amount corresponding to the user in the airdrop list
- **Merkle Proof:** Proof used to verify the user's claiming eligibility

**Claiming Process:**

1. User connects wallet
2. Frontend queries the user's claiming eligibility, amount, and Merkle Proof based on their address
3. Call the contract's `claim(amount, merkle_proof)` function to initiate the claiming transaction
4. After transaction confirmation, tokens will be directly transferred to the user's wallet

## 5. Airdrop Queries

After project creation, you can query airdrop status and progress at any time through the project's independent contract (Proxy Address).  
The `MoveflowAirdropImpl` contract provides the following commonly used query methods (all read-only, no gas consumption):

### **User Claim Status (`hasClaimed`)**

- **Function:** Determine whether a specified address has claimed the airdrop
- **Return:** `true` claimed / `false` not claimed

### **User Blacklist Status (`isBlacklisted`)**

- **Function:** Determine whether a specified address is blacklisted
- **Return:** `true` blacklisted / `false` normal

### **Total Claim Data**

- **`totalClaimed()`:** Total amount of tokens claimed
- **`totalClaimedUserCount()`:** Total number of users who have claimed

### **Eligibility Verification (`verifyProof`)**

- **Function:** Verify whether the user address, claim amount, and Merkle Proof match, and determine if they have claiming eligibility

### **Activity Status**

- **`isCancelled()`:** Whether the airdrop has been cancelled
- **`startTime()`:** Airdrop start time (Unix timestamp)

## 6. Contract Interface Call Examples

The following examples demonstrate how to interact with contracts using JavaScript (`ethers.js`) and Python (`web3.py`).

### **6.1 Create Airdrop (`createProject`)**

#### **Required ABI Definitions**

```javascript
// MoveflowAirdropFactory - createProject function and event ABI
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

// ERC20 Token - approve function ABI
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

#### **JavaScript (ethers.js v6) Example**

```javascript
import { ethers } from "ethers";

// --- 1. Configure Environment ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const privateKey = "YOUR_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey, provider);

const factoryAddress = "MOVEFLOW_AIRDROP_FACTORY_ADDRESS";
const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);

const tokenAddress = "YOUR_ERC20_TOKEN_ADDRESS"; // If it's an ETH airdrop, use ethers.ZeroAddress
const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);

// --- 2. Set Airdrop Parameters ---
const airdropName = "My Awesome Airdrop";
const totalAirdropAmount = ethers.parseUnits("10000", 18); // Assuming 18 decimal places
const merkleRoot = "0x..."; // Obtained from Step 3
const startTime = Math.floor(Date.now() / 1000) + 3600; // Start in 1 hour
const isCanCancel = true;

async function createAirdrop() {
  try {
    // --- 3. For ERC20 tokens, authorize first ---
    if (tokenAddress !== ethers.ZeroAddress) {
      console.log("Approving token transfer...");
      const approveTx = await tokenContract.approve(
        factoryAddress,
        totalAirdropAmount
      );
      await approveTx.wait();
      console.log("Approval successful!");
    }

    // --- 4. Call createProject ---
    console.log("Creating airdrop project...");
    // If it's an ETH airdrop, send ETH through the value field
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

    // --- 5. Get proxy address from event ---
    // Parse ProjectCreated event
    const projectCreatedEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        ethers.id("ProjectCreated(uint256,address,address,uint256,bool)")
    );

    if (projectCreatedEvent) {
      // Decode event data
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

#### **Python (web3.py v7) Example**

```python
from web3 import Web3
from eth_account import Account
import time

# --- 1. Configure Environment ---
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

token_address = Web3.to_checksum_address("YOUR_ERC20_TOKEN_ADDRESS") # If it's an ETH airdrop, use "0x0000000000000000000000000000000000000000"
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

# --- 2. Set Airdrop Parameters ---
airdrop_name = "My Awesome Airdrop"
total_airdrop_amount = w3.to_wei(10000, "ether") # Assuming 18 decimal places
merkle_root = "0x..." # Obtained from Step 3
start_time = int(time.time()) + 3600 # Start in 1 hour
is_can_cancel = True

def create_airdrop():
    try:
        # --- 3. For ERC20 tokens, authorize first ---
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

        # --- 4. Call createProject ---
        print("Creating airdrop project...")
        # If it's an ETH airdrop, send ETH through the value field
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

        # --- 5. Get proxy address from event ---
        # Get ProjectCreated event
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

### **6.2 Manage Airdrop**

#### **Management Function ABI Definitions**

```javascript
// MoveflowAirdropImpl - Management function ABI
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

#### **JavaScript (ethers.js v6) Example**

```javascript
// --- Configuration ---
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const projectContract = new ethers.Contract(
  projectProxyAddress,
  implAbi,
  wallet
);

// --- Call Examples ---
async function manageAirdrop() {
  // Cancel airdrop (before activity starts)
  // const tx = await projectContract.cancelAirdrop();

  // Rollback funds (after activity starts)
  // const tx = await projectContract.rollbackAirdrop();

  // Blacklist user
  const userToBlacklist = "0x...";
  const tx = await projectContract.addToBlacklist(userToBlacklist);

  await tx.wait();
  console.log("Management action successful!");
}
```

#### **Python (web3.py v7) Example**

```python
# --- Configuration ---
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

# --- Call Examples ---
def manage_airdrop():
    tx_params = {'from': account.address, 'nonce': w3.eth.get_transaction_count(account.address)}

    # Cancel airdrop (before activity starts)
    # tx = project_contract.functions.cancelAirdrop().build_transaction(tx_params)

    # Rollback funds (after activity starts)
    # tx = project_contract.functions.rollbackAirdrop().build_transaction(tx_params)

    # Blacklist user
    user_to_blacklist = "0x..."
    tx = project_contract.functions.addToBlacklist(user_to_blacklist).build_transaction(tx_params)

    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Management action successful! Tx: {tx_hash.hex()}")
```

### **6.3 User Claim Airdrop**

Users need to call the `claim` function of the `MoveflowAirdropImpl` contract to claim the airdrop. Before claiming, users need to:

1. Get their own Merkle proof (usually provided by frontend or API)
2. Understand fee information (call `getFeeInfo` to query)
3. Prepare the corresponding fee payment method

#### **6.3.1 Query Fee Information (`getFeeInfo`)**

Before claiming the airdrop, users should first query fee information to understand the fee type and amount they need to pay.

##### **JavaScript (ethers.js v6) Example**

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

// Usage example
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const claimAmount = ethers.parseUnits("100", 18);
queryFeeInfo(projectProxyAddress, claimAmount);
```

##### **Python (web3.py v7) Example**

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

    project_contract = w3.eth.contract(address=project_proxy_address, abi=get_fee_info_abi)

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

# Usage example
project_proxy_address = Web3.to_checksum_address("YOUR_PROJECT_PROXY_ADDRESS")
claim_amount = w3.to_wei(100, "ether")
query_fee_info(project_proxy_address, claim_amount)
```

#### **6.3.2 Claim Airdrop (`claim`)**

Now let's implement the actual claim function. Users need to call the `claim` function of the `MoveflowAirdropImpl` contract to claim their airdrop.

##### **Claim Function ABI Definition**

```javascript
// MoveflowAirdropImpl - claim function ABI
const claimAbi = [
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
```

##### **JavaScript (ethers.js v6) Example**

```javascript
import { ethers } from "ethers";

// --- Configuration ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const privateKey = "USER_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey, provider);

const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const projectContract = new ethers.Contract(
  projectProxyAddress,
  claimAbi,
  wallet
);

async function claimAirdrop() {
  try {
    // --- 1. Get user claim information ---
    const claimAmount = ethers.parseUnits("100", 18); // User's claimable amount
    const merkleProof = [
      "0x...", // Merkle proof provided by backend, remove 0x prefix
      "0x...",
      "0x...",
    ];

    // --- 2. Query fee information ---
    const feeInfo = await projectContract.getFeeInfo(claimAmount);
    const feeAmount = feeInfo[0];
    const feeToken = feeInfo[1];
    const feeType = feeInfo[2]; // 0: FIXED_ETH, 1: FIXED_TOKEN, 2: PERCENTAGE

    console.log(`Fee amount: ${ethers.formatUnits(feeAmount, 18)}`);
    console.log(`Fee type: ${feeType}`);

    // --- 3. Prepare payment based on fee type ---
    const txOptions = {
      gasLimit: 300000, // Estimate or set reasonable gas limit
    };

    if (feeType === 0n) {
      // FIXED_ETH_FEE: Need to send ETH as fee
      txOptions.value = feeAmount;
      console.log(`Sending ${ethers.formatEther(feeAmount)} ETH as fee`);
    } else if (feeType === 1n) {
      // FIXED_TOKEN_FEE: Need to approve fee token first
      const feeTokenAbi = [
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
      // PERCENTAGE_FEE: Fee deducted from claim amount, no additional action needed
      console.log(
        `Fee will be deducted from claim amount: ${ethers.formatUnits(
          feeAmount,
          18
        )}`
      );
    }

    // --- 4. Call claim function ---
    console.log("Claiming airdrop...");
    const claimTx = await projectContract.claim(
      claimAmount,
      merkleProof,
      txOptions
    );

    const receipt = await claimTx.wait();
    console.log("Airdrop claimed successfully!");
    console.log(`Transaction hash: ${receipt.hash}`);

    // If it's percentage fee, calculate actual received amount
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

##### **Python (web3.py v7) Example**

```python
from web3 import Web3
from eth_account import Account

# --- Configuration ---
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
        # --- 1. Get user claim information ---
        claim_amount = w3.to_wei(100, "ether")  # User's claimable amount
        merkle_proof = [
            bytes.fromhex("..."),  # Merkle proof provided by backend, remove 0x prefix
            bytes.fromhex("..."),
            bytes.fromhex("...")
        ]

        # --- 2. Query fee information ---
        fee_info = project_contract.functions.getFeeInfo(claim_amount).call()
        fee_amount = fee_info[0]
        fee_token = fee_info[1]
        fee_type = fee_info[2]  # 0: FIXED_ETH, 1: FIXED_TOKEN, 2: PERCENTAGE

        print(f"Fee amount: {w3.from_wei(fee_amount, 'ether')}")
        print(f"Fee type: {fee_type}")

        # --- 3. Prepare payment based on fee type ---
        tx_params = {
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 300000,  # Estimate or set reasonable gas limit
            'gasPrice': w3.eth.gas_price
        }

        if fee_type == 0:  # FIXED_ETH_FEE
            # Need to send ETH as fee
            tx_params['value'] = fee_amount
            print(f"Sending {w3.from_wei(fee_amount, 'ether')} ETH as fee")

        elif fee_type == 1:  # FIXED_TOKEN_FEE
            # Need to approve fee token first
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
            approve_hash = w3.eth.send_raw_transaction(signed_approve.rawTransaction)
            w3.eth.wait_for_transaction_receipt(approve_hash)
            print("Fee token approved!")

            # Update nonce
            tx_params['nonce'] = w3.eth.get_transaction_count(account.address)

        elif fee_type == 2:  # PERCENTAGE_FEE
            # Percentage fee deducted from claim amount, no additional action needed
            print(f"Fee will be deducted from claim amount: {w3.from_wei(fee_amount, 'ether')}")

        # --- 4. Call claim function ---
        print("Claiming airdrop...")
        claim_tx = project_contract.functions.claim(
            claim_amount,
            merkle_proof
        ).build_transaction(tx_params)

        signed_tx = account.sign_transaction(claim_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        print("Airdrop claimed successfully!")
        print(f"Transaction hash: {tx_hash.hex()}")

        # If it's percentage fee, calculate actual received amount
        if fee_type == 2:
            actual_received = claim_amount - fee_amount
            print(f"Actual amount received: {w3.from_wei(actual_received, 'ether')}")

    except Exception as e:
        print(f"Failed to claim airdrop: {e}")

claim_airdrop()
```

### **6.4 Query Interface Examples**

The `MoveflowAirdropImpl` contract provides multiple query interfaces that users and project owners can use to query airdrop status and information.

#### **6.4.1 Query Interface Examples**

##### **Query Interface ABI**

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

##### **JavaScript (ethers.js v6) Example**

```javascript
import { ethers } from "ethers";

// --- Configuration ---
const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const projectProxyAddress = "YOUR_PROJECT_PROXY_ADDRESS";
const projectContract = new ethers.Contract(
  projectProxyAddress,
  queryAbi,
  provider
);

async function queryAirdropInfo() {
  try {
    const userAddress = "0x..."; // User address to query
    const claimAmount = ethers.parseUnits("100", 18);
    const merkleProof = [
      "0x...", // Merkle proof for this user
      "0x...",
      "0x...",
    ];

    // 1. Query user claim status
    const hasClaimed = await projectContract.hasClaimed(userAddress);
    console.log(`User has claimed: ${hasClaimed}`);

    // 2. Query user blacklist status
    const isBlacklisted = await projectContract.isBlacklisted(userAddress);
    console.log(`User is blacklisted: ${isBlacklisted}`);

    // 3. Query total claimed data
    const totalClaimed = await projectContract.totalClaimed();
    const totalClaimedUserCount = await projectContract.totalClaimedUserCount();
    console.log(`Total claimed: ${ethers.formatUnits(totalClaimed, 18)}`);
    console.log(`Total claimed users: ${totalClaimedUserCount}`);

    // 4. Query Merkle root
    const merkleRoot = await projectContract.merkleRoot();
    console.log(`Merkle root: ${merkleRoot}`);

    // 5. Verify Merkle proof
    const isValid = await projectContract.verifyProof(
      userAddress,
      claimAmount,
      merkleProof
    );
    console.log(`Proof is valid: ${isValid}`);

    // 6. Query if airdrop is cancelled
    const isCancelled = await projectContract.isCancelled();
    console.log(`Airdrop is cancelled: ${isCancelled}`);

    // 7. Query airdrop start time
    const startTime = await projectContract.startTime();
    const startDate = new Date(Number(startTime) * 1000);
    console.log(`Start time: ${startDate.toISOString()}`);

    // Comprehensive status check
    const currentTime = Math.floor(Date.now() / 1000);

    if (isCancelled) {
      console.log("Status: Airdrop has been cancelled");
    } else if (currentTime < startTime) {
      console.log("Status: Airdrop not started yet");
    } else if (hasClaimed) {
      console.log("Status: User has already claimed");
    } else if (isBlacklisted) {
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

##### **Python (web3.py v7) Example**

```python
from web3 import Web3
from datetime import datetime

# --- Configuration ---
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
        user_address = "0x..."  # User address to query
        claim_amount = w3.to_wei(100, "ether")
        merkle_proof = [
            bytes.fromhex("..."),  # Merkle proof for this user
            bytes.fromhex("..."),
            bytes.fromhex("...")
        ]

        # 1. Query user claim status
        claimed = project_contract.functions.hasClaimed(user_address).call()
        print(f"User has claimed: {claimed}")

        # 2. Query user blacklist status
        blacklisted = project_contract.functions.isBlacklisted(user_address).call()
        print(f"User is blacklisted: {blacklisted}")

        # 3. Query total claimed data
        total_claimed = project_contract.functions.totalClaimed().call()
        total_claimed_user_count = project_contract.functions.totalClaimedUserCount().call()
        print(f"Total claimed: {w3.from_wei(total_claimed, 'ether')}")
        print(f"Total claimed users: {total_claimed_user_count}")

        # 4. Query Merkle root
        root = project_contract.functions.merkleRoot().call()
        print(f"Merkle root: {root.hex()}")

        # 5. Verify Merkle proof
        is_valid = project_contract.functions.verifyProof(
            user_address,
            claim_amount,
            merkle_proof
        ).call()
        print(f"Proof is valid: {is_valid}")

        # 6. Query if airdrop is cancelled
        cancelled = project_contract.functions.isCancelled().call()
        print(f"Airdrop is cancelled: {cancelled}")

        # 7. Query airdrop start time
        start_timestamp = project_contract.functions.startTime().call()
        start_date = datetime.fromtimestamp(start_timestamp)
        print(f"Start time: {start_date.isoformat()}")

        # Comprehensive status check
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

#### **6.4.2 Batch Query Examples**

For scenarios that require querying multiple user statuses, you can use batch queries to optimize performance:

##### **JavaScript (ethers.js v6)**

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

// Usage example
const users = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901",
  "0x3456789012345678901234567890123456789012",
];
batchQueryUsers(users);
```

##### **Python (web3.py v7)**

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

# Usage example
users = [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901",
    "0x3456789012345678901234567890123456789012"
]
batch_query_users(users)
```
