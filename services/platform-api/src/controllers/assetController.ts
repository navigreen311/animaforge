import type { Request, Response, NextFunction } from "express";
import { CreateAssetSchema } from "../models/assetSchemas.js";
import * as assetService from "../services/assetService.js";

const STUB_OWNER_ID = "00000000-0000-0000-0000-000000000001";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateAssetSchema.parse(req.body);
    const asset = assetService.createAsset(input, STUB_OWNER_ID);
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, type, page, limit } = req.query;
    const result = assetService.listAssets({
      projectId: projectId as string | undefined,
      type: type as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) || "";
    if (!q) {
      res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Query parameter q is required" },
      });
      return;
    }
    const result = assetService.searchAssets(q);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const asset = assetService.getAssetById(req.params.id);
    if (!asset) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Asset not found" },
      });
      return;
    }
    res.json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = assetService.deleteAsset(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Asset not found" },
      });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
