#!/usr/bin/env node

/**
 * 测试路径编码的一致性
 */

// 模拟 encodeVaultPath 函数
function encodeVaultPath(vaultPath) {
    // Remove surrounding quotes if present
    let normalizedPath = vaultPath.trim();
    if (normalizedPath.startsWith('"') && normalizedPath.endsWith('"')) {
        normalizedPath = normalizedPath.slice(1, -1);
    }

    // Encode to Base64
    const encoded = Buffer.from(normalizedPath).toString('base64');
    return encoded;
}

// 测试用例
const testCases = [
    '/Users/mengdoo/Downloads/vault-test4.kdbx',
    '"/Users/mengdoo/Downloads/vault-test4.kdbx"',  // 带引号
    '  /Users/mengdoo/Downloads/vault-test4.kdbx  ',  // 带空格
    '  "/Users/mengdoo/Downloads/vault-test4.kdbx"  ',  // 带引号和空格
];

console.log('=== 路径编码一致性测试 ===\n');

const encodedResults = testCases.map(path => {
    const encoded = encodeVaultPath(path);
    return { original: path, encoded };
});

// 打印结果
encodedResults.forEach(({ original, encoded }, index) => {
    console.log(`测试 ${index + 1}:`);
    console.log(`  原始路径: "${original}"`);
    console.log(`  编码结果: ${encoded}`);
    console.log(`  解码验证: ${Buffer.from(encoded, 'base64').toString()}`);
    console.log();
});

// 验证所有编码是否一致
const allEncoded = encodedResults.map(r => r.encoded);
const allSame = allEncoded.every(e => e === allEncoded[0]);

console.log('=== 一致性检查 ===');
console.log(`所有编码是否一致: ${allSame ? '✅ 是' : '❌ 否'}`);

if (allSame) {
    console.log(`\n✅ 成功！所有不同格式的路径都编码为相同的值：`);
    console.log(`   ${allEncoded[0]}`);
} else {
    console.log(`\n❌ 失败！编码不一致：`);
    allEncoded.forEach((e, i) => {
        console.log(`   测试 ${i + 1}: ${e}`);
    });
}

// 验证实际的 Keychain 路径
console.log('\n=== 实际 Keychain 路径验证 ===');
const actualPath = '/Users/mengdoo/Downloads/vault-test4.kdbx';
const actualEncoded = encodeVaultPath(actualPath);
const expectedFromLog = 'L1VzZXJzL21lbmdkb28vRG93bmxvYWRzL3ZhdWx0LXRlc3Q0LmtkYng=';

console.log(`实际路径: ${actualPath}`);
console.log(`编码结果: ${actualEncoded}`);
console.log(`日志中的编码: ${expectedFromLog}`);
console.log(`匹配: ${actualEncoded === expectedFromLog ? '✅ 是' : '❌ 否'}`);
