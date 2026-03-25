import type { Request, Response, NextFunction } from "express";
import {
  CreateCharacterSchema,
  UpdateCharacterSchema,
} from "../models/characterSchemas.js";
import * as characterService from "../services/characterService.js";

const STUB_OWNER_ID = "00000000-0000-0000-0000-000000000001";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCharacterSchema.parse(req.body);
    const character = characterService.createCharacter(input, STUB_OWNER_ID);
    res.status(201).json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, ownerId, page, limit } = req.query;
    const result = characterService.listCharacters({
      projectId: projectId as string | undefined,
      ownerId: ownerId as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const character = characterService.getCharacterById(req.params.id);
    if (!character) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Character not found" },
      });
      return;
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateCharacterSchema.parse(req.body);
    const character = characterService.updateCharacter(req.params.id, input);
    if (!character) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Character not found" },
      });
      return;
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

export async function triggerTwin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = characterService.triggerDigitalTwin(req.params.id);
    if (!result) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Character not found" },
      });
      return;
    }
    res.status(202).json({ success: true, data: { job_id: result.jobId } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = characterService.deleteCharacter(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Character not found" },
      });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
