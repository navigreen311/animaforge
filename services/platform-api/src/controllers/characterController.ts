import type { Request, Response, NextFunction } from "express";
import {
  AvatarArtifacts,
  CreateCharacterSchema,
  HairParams,
  UpdateCharacterSchema,
  Wardrobe,
} from "../models/characterSchemas.js";
import * as characterService from "../services/characterService.js";

const STUB_OWNER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Read the `:id` path parameter as a string.
 *
 * `@types/express` v5 types route params as `string | string[]` because a
 * pattern can repeat, so passing `pathId(req)` straight into a
 * `(id: string)` signature does not type-check.
 */
function pathId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

function notFound(res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Character not found" },
  });
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCharacterSchema.parse(req.body);
    const character = await characterService.createCharacter(input, STUB_OWNER_ID);
    res.status(201).json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, ownerId, page, limit } = req.query;
    const result = await characterService.listCharacters({
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
    const character = await characterService.getCharacterById(pathId(req));
    if (!character) {
      notFound(res);
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
    const character = await characterService.updateCharacter(pathId(req), input);
    if (!character) {
      notFound(res);
      return;
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/** PUT /characters/:id/hair — persists the Hair tab's state. */
export async function updateHair(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hairParams = HairParams.parse(req.body);
    const character = await characterService.updateHairParams(
      pathId(req),
      hairParams
    );
    if (!character) {
      notFound(res);
      return;
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/** PUT /characters/:id/wardrobe — persists the Wardrobe tab's state. */
export async function updateWardrobe(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const wardrobe = Wardrobe.parse(req.body);
    const character = await characterService.updateWardrobe(
      pathId(req),
      wardrobe
    );
    if (!character) {
      notFound(res);
      return;
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/** PUT /characters/:id/avatar — records X5 reconstruction artifacts. */
export async function updateAvatarArtifacts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const artifacts = AvatarArtifacts.parse(req.body);
    const character = await characterService.updateAvatarArtifacts(
      pathId(req),
      artifacts
    );
    if (!character) {
      notFound(res);
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
    const result = await characterService.triggerDigitalTwin(pathId(req));
    if (!result) {
      notFound(res);
      return;
    }
    res.status(202).json({ success: true, data: { job_id: result.jobId } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await characterService.deleteCharacter(pathId(req));
    if (!deleted) {
      notFound(res);
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
