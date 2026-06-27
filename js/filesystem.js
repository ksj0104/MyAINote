/* ============================================================
 * filesystem.js — 가상 유닉스 파일시스템 엔진
 * 트리 구조 + 권한/소유자 메타데이터 + 경로 해석
 * ============================================================ */

function dir(name, perms, owner, children) {
  return { type: 'dir', name, perms: perms || 'rwxr-xr-x', owner: owner || 'root', children: children || {} };
}
function file(name, content, perms, owner) {
  return { type: 'file', name, content: content == null ? '' : content, perms: perms || 'rw-r--r--', owner: owner || 'root' };
}

class FileSystem {
  constructor(root) {
    this.root = root || dir('/', 'rwxr-xr-x', 'root', {});
  }

  // 경로 토큰화: 절대/상대/~/./.. 해석
  resolve(path, cwd) {
    if (path == null || path === '') path = '.';
    let parts;
    if (path === '~' || path.startsWith('~/')) {
      const m = String(cwd || '').match(/^\/home\/([^/]+)/);
      const home = m ? '/home/' + m[1] : '/home/guest';
      path = home + path.slice(1);
    } else if (/^~[^/]+/.test(path)) {
      const m = path.match(/^~([^/]+)(.*)$/);
      path = (m[1] === 'root' ? '/root' : '/home/' + m[1]) + (m[2] || '');
    }
    if (path.startsWith('/')) {
      parts = path.split('/');
    } else {
      parts = (cwd + '/' + path).split('/');
    }
    const stack = [];
    for (const p of parts) {
      if (p === '' || p === '.') continue;
      if (p === '..') { stack.pop(); continue; }
      stack.push(p);
    }
    return '/' + stack.join('/');
  }

  getNode(absPath) {
    if (absPath === '/' || absPath === '') return this.root;
    const parts = absPath.split('/').filter(Boolean);
    let node = this.root;
    for (const p of parts) {
      if (node.type !== 'dir' || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  getParent(absPath) {
    const parts = absPath.split('/').filter(Boolean);
    parts.pop();
    return this.getNode('/' + parts.join('/'));
  }

  basename(absPath) {
    const parts = absPath.split('/').filter(Boolean);
    return parts[parts.length - 1] || '/';
  }

  // 권한 체크: user가 node를 읽을 수 있는가
  canRead(node, user) {
    if (user === 'root') return true;
    if (node.owner === user) return node.perms[0] === 'r';
    return node.perms[6] === 'r';
  }
  canExec(node, user) {
    if (user === 'root') return true;
    if (node.owner === user) return node.perms[2] === 'x';
    return node.perms[8] === 'x';
  }
  canWrite(node, user) {
    if (user === 'root') return true;
    if (node.owner === user) return node.perms[1] === 'w';
    return node.perms[7] === 'w';
  }

  // 파일 쓰기/생성 (리다이렉션 >, >> 및 편집용). 권한 체크 포함.
  writePath(absPath, content, opts) {
    opts = opts || {};
    const user = opts.user || 'root';
    const node = this.getNode(absPath);
    if (node) {
      if (node.type === 'dir') return { err: 'Is a directory' };
      if (!this.canWrite(node, user)) return { err: 'Permission denied' };
      node.content = opts.append ? (node.content + content) : content;
      return { ok: true, node };
    }
    const parent = this.getParent(absPath);
    if (!parent || parent.type !== 'dir') return { err: 'No such file or directory' };
    if (!this.canWrite(parent, user) || !this.canExec(parent, user)) return { err: 'Permission denied' };
    const name = this.basename(absPath);
    const f = file(name, content, 'rw-r--r--', user);
    parent.children[name] = f;
    return { ok: true, node: f, created: true };
  }

  // 노드 생성 헬퍼 (mkdir/touch)
  makeNode(absPath, kind, user) {
    user = user || 'root';
    if (this.getNode(absPath)) return { err: 'File exists' };
    const parent = this.getParent(absPath);
    if (!parent || parent.type !== 'dir') return { err: 'No such file or directory' };
    if (!this.canWrite(parent, user) || !this.canExec(parent, user)) return { err: 'Permission denied' };
    const name = this.basename(absPath);
    parent.children[name] = kind === 'dir'
      ? dir(name, 'rwxr-xr-x', user, {})
      : file(name, '', 'rw-r--r--', user);
    return { ok: true, node: parent.children[name] };
  }

  remove(absPath, user) {
    user = user || 'root';
    const node = this.getNode(absPath);
    if (!node) return { err: 'No such file or directory' };
    const parent = this.getParent(absPath);
    if (!parent || !this.canWrite(parent, user)) return { err: 'Permission denied' };
    delete parent.children[this.basename(absPath)];
    return { ok: true };
  }
}

// octal(예: 755) → rwx 문자열
function octalToPerms(oct) {
  const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const s = String(oct).padStart(3, '0').slice(-3);
  return map[+s[0]] + map[+s[1]] + map[+s[2]];
}

if (typeof window !== 'undefined') {
  window.FS = { FileSystem, dir, file, octalToPerms };
}
