
export interface PasswordAuditResult {
    score: number; // 0-100 (roughly bits of entropy, capped or scaled)
    label: 'Very Weak' | 'Weak' | 'Good' | 'Strong' | 'Excellent';
    color: string;
    entropy: number;
}

export const auditPassword = (password: string): PasswordAuditResult => {
    if (!password) {
        return { score: 0, label: 'Very Weak', color: 'text-gray-400', entropy: 0 };
    }

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32; // Approximate special chars

    const entropy = password.length * Math.log2(Math.max(poolSize, 1));

    let label: PasswordAuditResult['label'] = 'Very Weak';
    let color = 'text-red-500';

    if (entropy < 28) {
        label = 'Very Weak';
        color = 'text-red-600';
    } else if (entropy < 36) {
        label = 'Weak';
        color = 'text-orange-500';
    } else if (entropy < 60) {
        label = 'Good';
        color = 'text-yellow-500';
    } else if (entropy < 128) {
        label = 'Strong';
        color = 'text-green-500';
    } else {
        label = 'Excellent';
        color = 'text-emerald-600';
    }

    // Scale score for UI (0-100), capping at 128 bits for 100%
    const score = Math.min(100, Math.round((entropy / 128) * 100));

    return { score, label, color, entropy: Math.round(entropy) };
};
