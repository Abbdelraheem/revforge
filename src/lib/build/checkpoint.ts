import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CheckpointInfo {
  iteration: number;
  commitHash: string;
  parityScore: number;
}

/**
 * Manages incremental checkpoints within a build workspace via git.
 */
export class WorkspaceCheckpointManager {
  constructor(private workspaceDir: string) {}

  async init(): Promise<void> {
    try {
      await execFileAsync("git", ["init"], { cwd: this.workspaceDir, shell: false });
      await execFileAsync("git", ["config", "user.name", "RevForge Engine"], {
        cwd: this.workspaceDir,
        shell: false,
      });
      await execFileAsync("git", ["config", "user.email", "engine@revforge.ai"], {
        cwd: this.workspaceDir,
        shell: false,
      });
    } catch {
      // already initialized
    }
  }

  async saveCheckpoint(iteration: number, parityScore: number): Promise<string> {
    await execFileAsync("git", ["add", "-A"], { cwd: this.workspaceDir, shell: false });
    const message = `iteration ${iteration}: parity ${parityScore.toFixed(3)}`;
    const commit = await execFileAsync("git", ["commit", "-m", message, "--allow-empty"], {
      cwd: this.workspaceDir,
      shell: false,
    });
    const rev = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: this.workspaceDir,
      shell: false,
    });
    return rev.stdout.trim();
  }

  async rollbackTo(commitHash: string): Promise<void> {
    await execFileAsync("git", ["reset", "--hard", commitHash], {
      cwd: this.workspaceDir,
      shell: false,
    });
    await execFileAsync("git", ["clean", "-fd"], {
      cwd: this.workspaceDir,
      shell: false,
    });
  }
}
