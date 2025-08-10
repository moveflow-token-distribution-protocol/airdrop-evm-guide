import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";
import * as fs from "fs";
import * as path from "path";

/*
 * CSV文件格式说明：
 * 
 * 文件路径: ../data/airdrop_data.csv
 * 
 * 格式:
 * address,amount
 * 0x742d35Cc6634C0532925a3b8D0C9e3E04d5c36A,100
 * 0x742d35Cc6634C0532925a3b8D0C9e3E04d5c36B,250
 * 0x742d35Cc6634C0532925a3b8D0C9e3E04d5c36C,500
 * 
 * 注意：
 * - address: 以太坊地址（0x开头）
 * - amount: 代币数量（基本单位，不是Wei）
 * - 脚本读取时会自动乘以10^18转换为Wei
 * 
 * 示例：
 * CSV中的 100 表示 100个代币
 * 读取后转换为 100000000000000000000 Wei
 */

// 空投数据接口
interface AirdropData {
  address: string;
  amount: string;
}

// 生成Merkle Tree和相关数据
class MerkleTreeGenerator {
  private tree: MerkleTree;
  private leaves: string[];
  private airdropData: AirdropData[];

  constructor(airdropData: AirdropData[]) {
    this.airdropData = airdropData;
    this.leaves = airdropData.map(data => 
      keccak256(Buffer.concat([
        Buffer.from(data.address.slice(2), 'hex'),
        Buffer.from(data.amount.slice(2).padStart(64, '0'), 'hex')
      ]))
    );
    
    this.tree = new MerkleTree(this.leaves, keccak256, { sortPairs: true });
  }

  // 获取Merkle Root
  getMerkleRoot(): string {
    return this.tree.getHexRoot();
  }

  // 为指定地址生成证明
  generateProof(address: string, amount: string): string[] {
    const leaf = keccak256(Buffer.concat([
      Buffer.from(address.slice(2), 'hex'),
      Buffer.from(amount.slice(2).padStart(64, '0'), 'hex')
    ]));
    
    return this.tree.getHexProof(leaf);
  }

  // 验证证明
  verifyProof(address: string, amount: string, proof: string[]): boolean {
    const leaf = keccak256(Buffer.concat([
      Buffer.from(address.slice(2), 'hex'),
      Buffer.from(amount.slice(2).padStart(64, '0'), 'hex')
    ]));
    
    return this.tree.verify(proof, leaf, this.getMerkleRoot());
  }

  // 生成所有用户的证明数据
  generateAllProofs(): { [address: string]: { amount: string; proof: string[] } } {
    const allProofs: { [address: string]: { amount: string; proof: string[] } } = {};
    
    this.airdropData.forEach(data => {
      allProofs[data.address] = {
        amount: data.amount,
        proof: this.generateProof(data.address, data.amount)
      };
    });
    
    return allProofs;
  }

  // 保存数据到文件
  saveToFile(filename: string): void {
    const data = {
      merkleRoot: this.getMerkleRoot(),
      totalAddresses: this.airdropData.length,
      totalAmount: this.airdropData.reduce((sum, item) => sum + BigInt(item.amount), 0n).toString(),
      proofs: this.generateAllProofs()
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`数据已保存到 ${filename}`);
  }
}

// 示例：生成测试数据
function generateTestData(count: number): AirdropData[] {
  const testData: AirdropData[] = [];
  
  for (let i = 0; i < count; i++) {
    // 生成随机地址（实际使用时应该是真实的用户地址）
    const randomAddress = "0x" + Buffer.from(
      `user${i.toString().padStart(10, '0')}`, 'utf8'
    ).toString('hex').padStart(40, '0').slice(0, 40);
    
    // 生成随机数量（1-1000个代币），使用BigInt避免精度问题
    const randomTokenAmount = Math.floor(Math.random() * 1000) + 1;
    const amountInWei = BigInt(randomTokenAmount) * BigInt(10 ** 18);
    
    testData.push({
      address: randomAddress,
      amount: "0x" + amountInWei.toString(16)
    });
  }
  
  return testData;
}

// 从CSV文件加载数据
function loadFromCSV(filename: string): AirdropData[] {
  if (!fs.existsSync(filename)) {
    throw new Error(`文件 ${filename} 不存在`);
  }
  
  console.log(`正在从 ${filename} 加载空投数据...`);
  
  const csvContent = fs.readFileSync(filename, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error(`CSV文件格式错误：至少需要包含标题行和一条数据行`);
  }
  
  // 验证标题行
  const headerLine = lines[0].toLowerCase();
  if (!headerLine.includes('address') || !headerLine.includes('amount')) {
    throw new Error(`CSV文件格式错误：标题行必须包含 'address' 和 'amount' 字段`);
  }
  
  // 跳过标题行
  const dataLines = lines.slice(1);
  
  // 精确转换函数：将带小数点的字符串转换为Wei（BigInt）
  function stringToWei(amountStr: string): bigint {
    // 移除可能的空格
    const cleanAmount = amountStr.trim();
    
    // 检查是否包含小数点
    if (cleanAmount.includes('.')) {
      const [integerPart, decimalPart] = cleanAmount.split('.');
      
      // 确保小数部分不超过18位
      if (decimalPart.length > 18) {
        throw new Error(`小数位数过多：${cleanAmount}，最多支持18位小数`);
      }
      
      // 将小数部分补齐到18位（右边补0）
      const paddedDecimal = decimalPart.padEnd(18, '0');
      
      // 组合整数部分和小数部分
      const fullIntegerString = (integerPart || '0') + paddedDecimal;
      
      return BigInt(fullIntegerString);
    } else {
      // 没有小数点，直接乘以10^18
      return BigInt(cleanAmount) * BigInt(10 ** 18);
    }
  }
  
  return dataLines.map((line, index) => {
    const [address, amount] = line.split(',');
    
    if (!address || !amount) {
      throw new Error(`CSV文件第${index + 2}行格式错误：缺少address或amount字段`);
    }
    
    const addressTrimmed = address.trim();
    const amountTrimmed = amount.trim();
    
    // 验证地址格式
    if (!addressTrimmed.startsWith('0x') || addressTrimmed.length !== 42) {
      throw new Error(`CSV文件第${index + 2}行错误：地址格式无效 ${addressTrimmed}`);
    }
    
    // 验证数量格式 - 使用更精确的正则表达式
    const amountRegex = /^\d+(\.\d+)?$/;
    if (!amountRegex.test(amountTrimmed)) {
      throw new Error(`CSV文件第${index + 2}行错误：数量格式无效 ${amountTrimmed}`);
    }
    
    // 使用精确转换函数
    let amountInWei: bigint;
    try {
      amountInWei = stringToWei(amountTrimmed);
    } catch (error) {
      throw new Error(`CSV文件第${index + 2}行错误：数量转换失败 ${amountTrimmed} - ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 打印前几个地址的转换信息
    if (index < 3) {
      console.log(`  ${addressTrimmed}: ${amountTrimmed} 代币 -> ${amountInWei} Wei`);
    }
    
    return {
      address: addressTrimmed,
      amount: "0x" + amountInWei.toString(16)
    };
  });
}

// 主函数
async function main() {
  console.log("=== Merkle Tree 空投数据生成器 ===");
  console.log("支持100万用户的高效空投系统\n");
  
  // 检查是否有CSV文件
  const csvFile = path.join(__dirname, '../data/airdrop_data.csv');
  const exampleFile = path.join(__dirname, '../data/airdrop_data_example.csv');
  let airdropData: AirdropData[];
  
  if (fs.existsSync(csvFile)) {
    console.log("📂 发现CSV文件，正在加载真实空投数据...");
    try {
      airdropData = loadFromCSV(csvFile);
      console.log(`✅ 成功加载 ${airdropData.length} 个空投地址`);
    } catch (error) {
      console.error("❌ CSV文件加载失败:", error instanceof Error ? error.message : String(error));
      console.log(`\n💡 请参考示例文件格式: ${exampleFile}`);
      return;
    }
  } else {
    console.log("📄 未找到CSV文件，生成测试数据...");
    // 生成10个测试用户的数据（可以修改为100万）
    airdropData = generateTestData(10);
    
    // 创建示例CSV文件（amount为基本单位，不是Wei）
    const csvContent = "address,amount\n" + 
      airdropData.map(data => {
        const amountWei = BigInt(data.amount);
        // 精确转换：Wei转换为代币数量字符串
        const tokenAmount = amountWei / BigInt(10 ** 18);
        const remainder = amountWei % BigInt(10 ** 18);
        
        if (remainder === 0n) {
          return `${data.address},${tokenAmount}`;
        } else {
          // 如果有小数部分，需要格式化
          const decimalStr = remainder.toString().padStart(18, '0').replace(/0+$/, '');
          return `${data.address},${tokenAmount}${decimalStr ? '.' + decimalStr : ''}`;
        }
      }).join('\n');
    
    fs.mkdirSync(path.dirname(csvFile), { recursive: true });
    fs.writeFileSync(csvFile, csvContent);
    console.log(`📝 示例CSV文件已创建: ${csvFile}`);
    console.log(`📋 示例格式文件: ${exampleFile}`);
    console.log("\n💡 提示：");
    console.log("   - CSV文件中的amount为代币数量（如100），不是Wei");
    console.log("   - 脚本会自动将数量乘以10^18转换为Wei");
    console.log("   - 支持小数点，如 1.5 表示1.5个代币");
  }
  
  // 生成Merkle Tree
  console.log("\n🌳 生成Merkle Tree...");
  const generator = new MerkleTreeGenerator(airdropData);
  
  const merkleRoot = generator.getMerkleRoot();
  console.log(`📋 Merkle Root: ${merkleRoot}`);
  
  // 计算总空投数量 - 使用精确计算
  const totalAmount = airdropData.reduce((sum, item) => sum + BigInt(item.amount), 0n);
  // 精确转换显示
  const totalTokens = totalAmount / BigInt(10 ** 18);
  const totalRemainder = totalAmount % BigInt(10 ** 18);
  
  let totalTokensStr = totalTokens.toString();
  if (totalRemainder > 0n) {
    const decimalStr = totalRemainder.toString().padStart(18, '0').replace(/0+$/, '');
    totalTokensStr += decimalStr ? '.' + decimalStr : '';
  }
  
  console.log(`💰 总空投数量: ${totalAmount} Wei (${totalTokensStr} 代币)`);
  
  // 保存数据
  const outputFile = path.join(__dirname, '../data/merkle_data.json');
  generator.saveToFile(outputFile);
  
  // 验证几个示例
  console.log("\n=== 验证示例 ===");
  for (let i = 0; i < Math.min(3, airdropData.length); i++) {
    const data = airdropData[i];
    const proof = generator.generateProof(data.address, data.amount);
    const isValid = generator.verifyProof(data.address, data.amount, proof);
    
    const amountWei = BigInt(data.amount);
    // 精确转换显示
    const tokenAmount = amountWei / BigInt(10 ** 18);
    const remainder = amountWei % BigInt(10 ** 18);
    
    let tokenAmountStr = tokenAmount.toString();
    if (remainder > 0n) {
      const decimalStr = remainder.toString().padStart(18, '0').replace(/0+$/, '');
      tokenAmountStr += decimalStr ? '.' + decimalStr : '';
    }
    
    console.log(`地址 ${data.address}:`);
    console.log(`  数量: ${tokenAmountStr} 代币 (${amountWei} Wei)`);
    console.log(`  证明长度: ${proof.length}`);
    console.log(`  验证结果: ${isValid ? '✅' : '❌'}`);
  }
  
  console.log("\n🎉 Merkle Tree数据生成完成！");
  console.log(`📊 数据文件: ${outputFile}`);
  console.log(`📋 CSV文件: ${csvFile}`);
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

export { MerkleTreeGenerator, AirdropData }; 