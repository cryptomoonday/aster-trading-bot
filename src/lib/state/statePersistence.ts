import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import type { LocalPositionState } from "./positionState";

type PersistedState = {
  position: LocalPositionState;
  lastBarCloseTime: number;
  timestamp: number;
};

export class StatePersistence {
  private readonly stateFile: string;

  constructor(dataDir: string = "./data") {
    this.stateFile = join(dataDir, "bot-state.json");
  }

  save(state: { position: LocalPositionState; lastBarCloseTime: number }): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.stateFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const persisted: PersistedState = {
        ...state,
        timestamp: Date.now(),
      };
      writeFileSync(this.stateFile, JSON.stringify(persisted, null, 2), "utf-8");
    } catch (error) {
      console.error("[StatePersistence] Failed to save state", error);
    }
  }

  load(): { position: LocalPositionState; lastBarCloseTime: number } | null {
    try {
      if (!existsSync(this.stateFile)) {
        return null;
      }
      const content = readFileSync(this.stateFile, "utf-8");
      const persisted: PersistedState = JSON.parse(content);
      // Only load if state is less than 1 hour old
      const age = Date.now() - persisted.timestamp;
      if (age > 60 * 60 * 1000) {
        console.log("[StatePersistence] State too old, ignoring");
        return null;
      }
      return {
        position: persisted.position,
        lastBarCloseTime: persisted.lastBarCloseTime,
      };
    } catch (error) {
      console.error("[StatePersistence] Failed to load state", error);
      return null;
    }
  }

  clear(): void {
    try {
      if (existsSync(this.stateFile)) {
        writeFileSync(this.stateFile, "{}", "utf-8");
      }
    } catch (error) {
      console.error("[StatePersistence] Failed to clear state", error);
    }
  }
}

