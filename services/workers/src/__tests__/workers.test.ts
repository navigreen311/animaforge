import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateProgress,
  StageDefinition,
  JobStatus,
} from "../utils/jobHelpers.js";

const mockProcess = vi.fn();
const mockWorkerOn = vi.fn();
const mockWorkerClose = vi.fn();

vi.mock("bullmq", () => {
  const MockQueue = vi.fn().mockImplementation((name: string) => ({
    name,
    add: vi.fn().mockResolvedValue({ id: "test-job-1", name }),
    close: vi.fn().mockResolvedValue(undefined),
    getJobs: vi.fn().mockResolvedValue([]),
  }));

  const MockWorker = vi.fn().mockImplementation(
    (_name: string, processor: unknown) => {
      mockProcess.mockImplementation(processor as (...args: unknown[]) => unknown);
      return {
        on: mockWorkerOn,
        close: mockWorkerClose.mockResolvedValue(undefined),
      };
    },
  );

  return { Queue: MockQueue, Worker: MockWorker };
});

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      status: "ready",
      disconnect: vi.fn(),
    })),
  };
});

describe("jobHelpers", () => {
  describe("calculateProgress", () => {
    const stages: StageDefinition[] = [
      { name: "a", weight: 25 },
      { name: "b", weight: 25 },
      { name: "c", weight: 25 },
      { name: "d", weight: 25 },
    ];

    it("returns 0 progress when no stages are completed", () => {
      expect(calculateProgress(stages, -1)).toBe(0);
    });

    it("returns 25 after first stage", () => {
      expect(calculateProgress(stages, 0)).toBe(25);
    });

    it("returns 50 after second stage", () => {
      expect(calculateProgress(stages, 1)).toBe(50);
    });

    it("returns 100 after all stages", () => {
      expect(calculateProgress(stages, 3)).toBe(100);
    });

    it("handles uneven weights", () => {
      const uneven: StageDefinition[] = [
        { name: "x", weight: 10 },
        { name: "y", weight: 90 },
      ];
      expect(calculateProgress(uneven, 0)).toBe(10);
      expect(calculateProgress(uneven, 1)).toBe(100);
    });

    it("returns 0 for empty stage list", () => {
      expect(calculateProgress([], 0)).toBe(0);
    });
  });
});

describe("Queue definitions", () => {
  it("creates all four queues", async () => {
    const { allQueues } = await import("../queues/index.js");
    expect(allQueues).toHaveLength(4);
    const names = allQueues.map((q) => q.name);
    expect(names).toContain("generation");
    expect(names).toContain("governance");
    expect(names).toContain("export");
    expect(names).toContain("qc");
  });

  it("can add a job to the generation queue", async () => {
    const { generationQueue } = await import("../queues/index.js");
    const job = await generationQueue.add("test-gen", {
      type: "video",
      project_id: "proj-1",
      user_id: "user-1",
      params: {},
    });
    expect(job).toBeDefined();
    expect(job.id).toBe("test-job-1");
  });
});

describe("Generation worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a worker that registers event handlers", async () => {
    const { createGenerationWorker } = await import(
      "../workers/generationWorker.js"
    );
    const worker = createGenerationWorker(2);
    expect(worker).toBeDefined();
    expect(mockWorkerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(mockWorkerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });

  it("processor returns output_url and quality_scores", async () => {
    const { createGenerationWorker } = await import(
      "../workers/generationWorker.js"
    );
    createGenerationWorker();

    const mockJob = {
      id: "gen-1",
      data: {
        type: "video" as const,
        project_id: "proj-1",
        user_id: "user-1",
        params: {},
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue(undefined),
    };

    const result = await mockProcess(mockJob);
    expect(result).toHaveProperty("output_url");
    expect(result).toHaveProperty("quality_scores");
    expect(result.quality_scores).toHaveProperty("overall");
    expect(result.quality_scores).toHaveProperty("fidelity");
    expect(result.quality_scores).toHaveProperty("consistency");
    expect(result.output_url).toContain("proj-1");
    expect(result.output_url).toContain("video");
  });

  it("processor calls updateProgress and log during processing", async () => {
    const { createGenerationWorker } = await import(
      "../workers/generationWorker.js"
    );
    createGenerationWorker();

    const mockJob = {
      id: "gen-2",
      data: {
        type: "avatar" as const,
        project_id: "proj-2",
        user_id: "user-2",
        params: {},
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue(undefined),
    };

    await mockProcess(mockJob);

    expect(mockJob.updateProgress).toHaveBeenCalled();
    expect(mockJob.log).toHaveBeenCalled();

    const lastLogCall = mockJob.log.mock.calls[mockJob.log.mock.calls.length - 1][0];
    const lastStatus = JSON.parse(lastLogCall);
    expect(lastStatus.status).toBe("complete");
    expect(lastStatus.progress).toBe(100);
  });
});

describe("Governance worker", () => {
  it("creates a worker with event handlers", async () => {
    vi.clearAllMocks();
    const { createGovernanceWorker } = await import(
      "../workers/governanceWorker.js"
    );
    const worker = createGovernanceWorker();
    expect(worker).toBeDefined();
    expect(mockWorkerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(mockWorkerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });
});

describe("Export worker", () => {
  it("creates a worker with event handlers", async () => {
    vi.clearAllMocks();
    const { createExportWorker } = await import("../workers/exportWorker.js");
    const worker = createExportWorker();
    expect(worker).toBeDefined();
    expect(mockWorkerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(mockWorkerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });
});

describe("Status transitions", () => {
  it("job goes through queued -> running -> complete", async () => {
    const { createGenerationWorker } = await import(
      "../workers/generationWorker.js"
    );
    createGenerationWorker();

    const statusHistory: JobStatus[] = [];
    const mockJob = {
      id: "gen-status-1",
      data: {
        type: "img_to_cartoon" as const,
        project_id: "proj-3",
        user_id: "user-3",
        params: {},
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockImplementation((entry: string) => {
        const parsed = JSON.parse(entry);
        statusHistory.push(parsed.status);
        return Promise.resolve();
      }),
    };

    await mockProcess(mockJob);

    expect(statusHistory[0]).toBe("queued");
    expect(statusHistory[statusHistory.length - 1]).toBe("complete");
    expect(statusHistory).toContain("running");
    expect(statusHistory).not.toContain("failed");
  });
});
