// 简单的认证工具函数
// 用户名和密码使用 SHA-256 哈希存储

// 存储的哈希值（用户名: admin42, 密码: Kqdsxz-604）
const USERNAME_HASH = 'c674d9cdee160ebec3ed9ec138ac473480054483f185be25c27e51f35f30175f';
const PASSWORD_HASH = 'ebab04c5516d19cef2988945dc2303ec5552091f8252ee55a8d2fbca803d5f33';

// 计算字符串的 SHA-256 哈希
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function login(username: string, password: string): Promise<boolean> {
  const usernameHash = await sha256(username);
  const passwordHash = await sha256(password);
  
  if (usernameHash === USERNAME_HASH && passwordHash === PASSWORD_HASH) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', username);
    }
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isAuthenticated') === 'true';
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('username');
}

