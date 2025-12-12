const USERNAME_HASH = '43df0c909337b0435b06f388c2567a8c54ee489e93b82e1e0551d08ff1a4abe2';
const PASSWORD_HASH = '307c5aeca4d279c688321f4373d8ce40b9160b1b3434e390deb65d2b601ebc58';

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

