import * as child_process from 'child_process';
import * as path from 'path';

export class ScriptRunner {
  run(scriptPath: string, args: string[], workingDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const absScript = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.join(workingDir, scriptPath);

      child_process.execFile(absScript, args, { cwd: workingDir }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        resolve(stdout);
      });
    });
  }
}
