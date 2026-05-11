import { spawn as spawnProcess } from 'child_process';

export interface RuntimeStatus {
  platform: NodeJS.Platform;
  arch: string;
  backend: 'posix-pty' | 'winpty';
  pythonPath: string | null;
  pythonVersion: string | null;
  available: boolean;
  message: string;
}

interface RuntimeCheckOptions {
  pythonPath?: string;
}

export async function checkRuntimeStatus(_pluginDir: string, options: RuntimeCheckOptions = {}): Promise<RuntimeStatus> {
  const candidates = resolvePythonCandidates(options.pythonPath);
  const backend = process.platform === 'win32' ? 'winpty' : 'posix-pty';
  const script = process.platform === 'win32'
    ? 'import sys; import winpty; print(sys.version.split()[0])'
    : 'import sys; import pty; print(sys.version.split()[0])';

  let lastError: unknown;
  for (const pythonPath of candidates) {
    try {
      const pythonVersion = await runPythonCheck(pythonPath, script);
      return {
        platform: process.platform,
        arch: process.arch,
        backend,
        pythonPath,
        pythonVersion,
        available: true,
        message: process.platform === 'win32'
          ? 'Python and pywinpty are available.'
          : 'Python and the standard pty module are available.',
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    platform: process.platform,
    arch: process.arch,
    backend,
    pythonPath: candidates[0],
    pythonVersion: null,
    available: false,
    message: getRuntimeFailureMessage(lastError),
  };
}

function resolvePythonCandidates(pythonPath?: string): string[] {
  if (pythonPath) return [pythonPath];
  if (process.env.VAULT_TERMINAL_PYTHON) return [process.env.VAULT_TERMINAL_PYTHON];
  return process.platform === 'win32' ? ['python3', 'py'] : ['python3'];
}

function runPythonCheck(pythonPath: string, script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(pythonPath, ['-c', script], { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `${pythonPath} exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

function getRuntimeFailureMessage(error: unknown): string {
  const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
  if (process.platform === 'win32') {
    return `Python 3 with pywinpty is required.${detail} Install the latest Python from python.org, or set the correct Python path in Settings > Vault Terminal > Runtime.`;
  }
  return `Python 3 with the standard pty module is required.${detail}`;
}
